// models/PairCode.js
import mongoose from 'mongoose';

const pairCodeSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) }, // 5 mins
    isUsed: { type: Boolean, default: false }
});

export default mongoose.model('PairCode', pairCodeSchema);
