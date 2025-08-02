import { Schema, model } from 'mongoose';
const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, index: true, unique: true },
    isActive: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    sessionId: { type: String, default: null },
    expiryDate: { type: Date, default: null },
}, {
    timestamps: true
});
export default model('User', userSchema);
