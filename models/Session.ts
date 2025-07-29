import mongoose, { Schema, Document } from 'mongoose';
import { AuthenticationCreds } from '@whiskeysockets/baileys';

export interface ISession extends Document {
  userId: string;
  sessionId?: string;
  whatsappNumber: string;
  isLinked: boolean;
  isPaid: boolean;
  isActive: boolean;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  sessionData?: AuthenticationCreds;
}

const sessionSchema = new Schema<ISession>(
  {
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISession>('Session', sessionSchema);
