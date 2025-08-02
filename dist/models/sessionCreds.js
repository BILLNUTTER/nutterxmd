import mongoose from 'mongoose';
const sessionCredsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    creds: { type: Object, required: true }, // store JSON credentials
    lastUpdated: { type: Date, default: Date.now },
});
export default mongoose.model('SessionCreds', sessionCredsSchema);
