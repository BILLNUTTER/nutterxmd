"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const date_fns_1 = require("date-fns");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Payment_js_1 = __importDefault(require("../models/Payment.js"));
const Session_js_1 = __importDefault(require("../models/Session.js"));
const User_js_1 = __importDefault(require("../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../models/UserSettings.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// 🔐 Admin login using adminKey
router.post('/login', (req, res) => {
    const { adminKey } = req.body;
    console.log(`🔐 [POST] /admin/login attempt with key: ${adminKey ? '[PROVIDED]' : '[MISSING]'}`);
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey) {
        console.error('❌ ADMIN_KEY not defined in .env');
        return res.status(500).json({ message: 'Server misconfiguration' });
    }
    if (!adminKey || adminKey !== expectedKey) {
        console.warn('❌ Invalid adminKey attempt');
        return res.status(401).json({ message: 'Unauthorized: Invalid admin key' });
    }
    const token = jsonwebtoken_1.default.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('✅ Admin authenticated successfully');
    res.json({
        token,
        admin: {
            role: 'admin',
        },
    });
});
// 🔍 Get pending payments
router.get('/payments/pending', auth_js_1.adminAuth, async (_req, res) => {
    try {
        const payments = await Payment_js_1.default.find({ isVerified: false }).sort({ createdAt: -1 });
        const data = await Promise.all(payments.map(async (payment) => {
            const user = await User_js_1.default.findById(payment.userId).select('-password');
            const session = await Session_js_1.default.findOne({ sessionId: payment.sessionId });
            return {
                ...payment.toObject(),
                user: user?.toObject?.() ?? null,
                session: session?.toObject?.() ?? null,
            };
        }));
        res.json(data);
    }
    catch (err) {
        console.error('❌ Error fetching pending payments:', err);
        res.status(500).json({ message: 'Failed to get pending payments' });
    }
});
// ✅ Verify payment
router.post('/payments/verify', auth_js_1.adminAuth, async (req, res) => {
    try {
        const { paymentId, adminId = 'admin' } = req.body;
        const payment = await Payment_js_1.default.findById(paymentId);
        if (!payment)
            return res.status(404).json({ message: 'Payment not found' });
        payment.isVerified = true;
        payment.verifiedBy = adminId;
        await payment.save();
        const expiryDate = (0, date_fns_1.addDays)(new Date(), 30);
        await Promise.all([
            Session_js_1.default.findOneAndUpdate({ sessionId: payment.sessionId }, { isPaid: true, isActive: true, expiryDate }),
            User_js_1.default.findByIdAndUpdate(payment.userId, {
                isActive: true,
                expiryDate,
            }),
        ]);
        res.json({ message: '✅ Payment verified and session activated.' });
    }
    catch (err) {
        console.error('❌ Error verifying payment:', err);
        res.status(500).json({ message: 'Failed to verify payment' });
    }
});
// 📶 Active sessions
router.get('/sessions/active', auth_js_1.adminAuth, async (_req, res) => {
    try {
        const sessions = await Session_js_1.default.find({ isActive: true }).sort({ createdAt: -1 });
        const data = await Promise.all(sessions.map(async (session) => {
            try {
                const user = await User_js_1.default.findById(session.userId).select('-password');
                // Safety check for missing user
                if (!user) {
                    console.warn(`⚠️ No user found for sessionId: ${session.sessionId}`);
                }
                return {
                    ...session.toObject(),
                    user: user ? user.toObject() : { username: 'Unknown', phone: 'N/A' },
                };
            }
            catch (innerErr) {
                console.error('❌ Failed to resolve user for session:', innerErr);
                return {
                    ...session.toObject(),
                    user: { username: 'Error', phone: 'Error' },
                };
            }
        }));
        res.json(data);
    }
    catch (err) {
        console.error('❌ Error fetching active sessions:', err);
        res.status(500).json({ message: 'Failed to get sessions' });
    }
});
// 👥 List users
router.get('/users', auth_js_1.adminAuth, async (_req, res) => {
    try {
        const users = await User_js_1.default.find({}).select('-password').sort({ createdAt: -1 });
        const result = await Promise.all(users.map(async (user) => {
            const settings = await UserSettings_js_1.default.findOne({ userId: user._id.toString() });
            return {
                ...user.toObject(),
                settings: settings?.toObject?.() ?? null,
            };
        }));
        res.json(result);
    }
    catch (err) {
        console.error('❌ Error fetching users:', err);
        res.status(500).json({ message: 'Failed to get users' });
    }
});
// 📨 Send message (stub)
router.post('/send-message', auth_js_1.adminAuth, async (req, res) => {
    try {
        const { userId, message } = req.body;
        const user = await User_js_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        console.log(`📨 Message to ${user.username} (${user.phone}): ${message}`);
        res.json({ message: 'Message sent (log only)' });
    }
    catch (err) {
        console.error('❌ Error sending message:', err);
        res.status(500).json({ message: 'Failed to send message' });
    }
});
// 🔗 Link device (stub)
router.post('/link-device', auth_js_1.adminAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User_js_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        console.log(`🔗 Linking device for ${user.username} (${user.phone})`);
        res.json({ message: 'Device linking initiated (stub only)' });
    }
    catch (err) {
        console.error('❌ Error linking device:', err);
        res.status(500).json({ message: 'Failed to link device' });
    }
});
exports.default = router;
