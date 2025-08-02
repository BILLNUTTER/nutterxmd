import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
const router = Router();
// 🔐 User Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        if (!username || !email || !password || !phone) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({
            $or: [{ email: trimmedEmail }, { username: trimmedUsername }],
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({
            username: trimmedUsername,
            email: trimmedEmail,
            password: hashedPassword,
            phone,
            isActive: false,
        });
        await user.save();
        const settings = new UserSettings({
            userId: user._id.toString(),
            phone: user.phone,
            prefix: '.',
            mode: 'PUBLIC',
            blockedUsers: [],
            features: {
                autoReply: false,
                typingDelay: false,
                groupWelcome: false,
                scheduledMessages: false,
                referralMessage: false,
                onlineOnlyMode: false,
                paymentReminder: true,
                customCommands: false,
                menuCommand: true,
                blockCommand: false,
                unblockCommand: false,
                presence: 'typing',
                antiDelete: false,
                salute: false,
                autobio: false,
            },
            customCommands: [],
        });
        await settings.save();
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET is missing in .env');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        const token = jwt.sign({ userId: user._id }, jwtSecret, {
            expiresIn: '30d',
        });
        const response = {
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                phone: user.phone,
                isActive: user.isActive,
                sessionId: user.sessionId,
                expiryDate: user.expiryDate,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});
// 🔓 User Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }
        const user = await User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET is missing in .env');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        const token = jwt.sign({ userId: user._id }, jwtSecret, {
            expiresIn: '30d',
        });
        const response = {
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                phone: user.phone,
                isActive: user.isActive,
                sessionId: user.sessionId,
                expiryDate: user.expiryDate,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
        res.json(response);
    }
    catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});
export default router;
