import { Router, Request, Response } from 'express';
import Payment from '../models/payment.js';
import User from '../models/User.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

// Submit payment for verification
router.post('/submit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { mpesaCode, amount } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.sessionId) {
      return res.status(400).json({ message: 'No session found' });
    }

    // Create payment record
    const payment = new Payment({
      userId,
      sessionId: user.sessionId,
      mpesaCode,
      amount,
      isVerified: false,
    });

    await payment.save();

    res.json({ message: 'Payment submitted for verification' });
  } catch (error) {
    console.error('Payment submission error:', error);
    res.status(500).json({ message: 'Failed to submit payment' });
  }
});

// Get user's payment status
router.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ message: 'Failed to get payment status' });
  }
});

export default router;