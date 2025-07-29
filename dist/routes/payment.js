"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Payment_js_1 = __importDefault(require("../models/Payment.js"));
const User_js_1 = __importDefault(require("../models/User.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Submit payment for verification
router.post('/submit', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { mpesaCode, amount } = req.body;
        const user = await User_js_1.default.findById(userId);
        if (!user || !user.sessionId) {
            return res.status(400).json({ message: 'No session found' });
        }
        // Create payment record
        const payment = new Payment_js_1.default({
            userId,
            sessionId: user.sessionId,
            mpesaCode,
            amount,
            isVerified: false,
        });
        await payment.save();
        res.json({ message: 'Payment submitted for verification' });
    }
    catch (error) {
        console.error('Payment submission error:', error);
        res.status(500).json({ message: 'Failed to submit payment' });
    }
});
// Get user's payment status
router.get('/status', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const payments = await Payment_js_1.default.find({ userId }).sort({ createdAt: -1 });
        res.json(payments);
    }
    catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ message: 'Failed to get payment status' });
    }
});
exports.default = router;
