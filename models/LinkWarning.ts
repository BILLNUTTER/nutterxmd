import mongoose, { Document, Schema } from 'mongoose';

interface ILinkWarning extends Document {
  groupId: string;
  userId: string;
  warns: number;
}

const linkWarningSchema = new Schema<ILinkWarning>({
  groupId: { type: String, required: true },
  userId: { type: String, required: true },
  warns: { type: Number, default: 0 },
});

// ✅ Prevent model overwrite in dev environments
const LinkWarning = mongoose.models.LinkWarning || mongoose.model<ILinkWarning>('LinkWarning', linkWarningSchema);

export const getLinkWarning = async (groupId: string, userId: string): Promise<number> => {
  const doc = await LinkWarning.findOne({ groupId, userId });
  return doc?.warns || 0;
};

export const incrementLinkWarning = async (groupId: string, userId: string): Promise<void> => {
  await LinkWarning.findOneAndUpdate(
    { groupId, userId },
    { $inc: { warns: 1 } },
    { upsert: true, new: true }
  );
};

export const resetLinkWarning = async (groupId: string, userId: string): Promise<void> => {
  await LinkWarning.deleteOne({ groupId, userId });
};
