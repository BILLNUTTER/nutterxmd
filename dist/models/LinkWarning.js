import mongoose, { Schema } from 'mongoose';
const linkWarningSchema = new Schema({
    groupId: { type: String, required: true },
    userId: { type: String, required: true },
    warns: { type: Number, default: 0 },
});
// ✅ Prevent model overwrite in dev environments
const LinkWarning = mongoose.models.LinkWarning || mongoose.model('LinkWarning', linkWarningSchema);
export const getLinkWarning = async (groupId, userId) => {
    const doc = await LinkWarning.findOne({ groupId, userId });
    return doc?.warns || 0;
};
export const incrementLinkWarning = async (groupId, userId) => {
    await LinkWarning.findOneAndUpdate({ groupId, userId }, { $inc: { warns: 1 } }, { upsert: true, new: true });
};
export const resetLinkWarning = async (groupId, userId) => {
    await LinkWarning.deleteOne({ groupId, userId });
};
