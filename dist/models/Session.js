import mongoose, { Schema } from 'mongoose';
const sessionSchema = new Schema({
    userId: { type: String, required: true, index: true },
    sessionId: {
        type: String,
        default: null,
        index: {
            unique: true,
            sparse: true,
        },
    },
    whatsappNumber: { type: String, default: '' },
    isLinked: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    expiryDate: { type: Date },
    sessionData: {
        type: Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});
export default mongoose.model('Session', sessionSchema);
