import { Router } from 'express';
import { addDays } from 'date-fns';
import jwt from 'jsonwebtoken';
import Payment from '../models/payment';
import Session from '../models/Session';
import User from '../models/User';
import UserSettings from '../models/UserSettings';
import { adminAuth } from '../middleware/auth';
const router = Router();
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
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('✅ Admin authenticated successfully');
    res.json({
        token,
        admin: {
            role: 'admin',
        },
    });
});
// 🔍 Get pending payments
router.get('/payments/pending', adminAuth, async (_req, res) => {
    try {
        const payments = await Payment.find({ isVerified: false }).sort({ createdAt: -1 });
        const data = await Promise.all(payments.map(async (payment) => {
            const user = await User.findById(payment.userId).select('-password');
            const session = await Session.findOne({ sessionId: payment.sessionId });
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
router.post('/payments/verify', adminAuth, async (req, res) => {
    try {
        const { paymentId, adminId = 'admin' } = req.body;
        const payment = await Payment.findById(paymentId);
        if (!payment)
            return res.status(404).json({ message: 'Payment not found' });
        payment.isVerified = true;
        payment.verifiedBy = adminId;
        await payment.save();
        const expiryDate = addDays(new Date(), 30);
        await Promise.all([
            Session.findOneAndUpdate({ sessionId: payment.sessionId }, { isPaid: true, isActive: true, expiryDate }),
            User.findByIdAndUpdate(payment.userId, {
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
router.get('/sessions/active', adminAuth, async (_req, res) => {
    try {
        const sessions = await Session.find({ isActive: true }).sort({ createdAt: -1 });
        const data = await Promise.all(sessions.map(async (session) => {
            try {
                const user = await User.findById(session.userId).select('-password');
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
router.get('/users', adminAuth, async (_req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        const result = await Promise.all(users.map(async (user) => {
            const settings = await UserSettings.findOne({ userId: user._id.toString() });
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
router.post('/send-message', adminAuth, async (req, res) => {
    try {
        const { userId, message } = req.body;
        const user = await User.findById(userId);
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
router.post('/link-device', adminAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
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
export default router;
