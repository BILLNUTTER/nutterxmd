import mongoose, { Schema } from 'mongoose';
import { Payment } from '../shared/types.js';

const paymentSchema = new Schema<Payment>({
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  mpesaCode: { type: String, required: true },
  amount: { type: Number, required: true },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: String },
}, {
  timestamps: true
});

export default mongoose.model<Payment>('Payment', paymentSchema);