import mongoose, { Schema } from 'mongoose';
const signalKeySchema = new Schema({
    type: { type: String, required: true },
    id: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
}, {
    timestamps: true,
});
// Compound index to ensure uniqueness of key-type/id pair
signalKeySchema.index({ type: 1, id: 1 }, { unique: true });
export default mongoose.model('SignalKey', signalKeySchema);
