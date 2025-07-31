"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = __importDefault(require("../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../models/UserSettings.js"));
const router = (0, express_1.Router)();
// 🔐 User Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        if (!username || !email || !password || !phone) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const existingUser = await User_js_1.default.findOne({
            $or: [{ email: trimmedEmail }, { username: trimmedUsername }],
        });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const user = new User_js_1.default({
            username: trimmedUsername,
            email: trimmedEmail,
            password: hashedPassword,
            phone,
            isActive: false,
        });
        await user.save();
        const settings = new UserSettings_js_1.default({
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
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, jwtSecret, {
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
        const user = await User_js_1.default.findOne({ username: username.trim() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET is missing in .env');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, jwtSecret, {
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
exports.default = router;
