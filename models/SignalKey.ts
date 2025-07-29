import mongoose, { Schema, Document } from 'mongoose';
import { SignalDataTypeMap } from '@whiskeysockets/baileys';

export interface ISignalKey extends Document {
  type: keyof SignalDataTypeMap;
  id: string;
  value: SignalDataTypeMap[keyof SignalDataTypeMap];
}

const signalKeySchema = new Schema<ISignalKey>(
  {
    type: { type: String, required: true },
    id: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of key-type/id pair
signalKeySchema.index({ type: 1, id: 1 }, { unique: true });

export default mongoose.model<ISignalKey>('SignalKey', signalKeySchema);
