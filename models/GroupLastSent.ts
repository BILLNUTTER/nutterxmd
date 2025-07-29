import mongoose from 'mongoose';

const groupLastSentSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true },
  lastSent: { type: Date, required: true },
});

export default mongoose.model('GroupLastSent', groupLastSentSchema);
