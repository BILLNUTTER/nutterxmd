import { WASocket, proto } from '@whiskeysockets/baileys';

// User model used internally (MongoDB schema)
export interface User {
  _id?: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  isActive: boolean;
  sessionId?: string;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  id: string;
}

// Used on the frontend – hides sensitive fields and uses `id` instead of `_id`
export type ClientUser = Omit<User, 'password' | '_id'> & { id: string };

// WhatsApp session metadata
export interface Session {
  _id?: string;
  userId: string;
  sessionId: string;
  whatsappNumber: string;
  sessionPath?: string; // Filepath where auth state is saved (optional)
  isLinked: boolean;
  isPaid: boolean;
  isActive: boolean;
  expiryDate?: Date;
  createdAt: Date;
  sessionData?: BaileysSessionData; // ✅ Baileys in-memory auth state
}

// M-Pesa or other payment info
export interface Payment {
  _id?: string;
  userId: string;
  sessionId: string;
  mpesaCode: string;
  amount: number;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: Date;
}

type PresenceMode = 'typing' | 'recording' | 'available' | 'off';
// Feature toggle state for each user
export interface BotFeatures {
  autoReply: boolean;
  typingDelay: boolean;
  groupEvents: boolean;
  groupWelcome: boolean;
  scheduledMessages: boolean;
  salute: boolean;
  referralMessage: boolean;
  antilink: boolean;
  paymentReminder: boolean;
  customCommands: boolean;
  menuCommand: boolean;
  blockCommand: boolean;
  unblockCommand: boolean;
  presence: PresenceMode;
  antiDelete: boolean;
  autobio: boolean;
  autoread: boolean;
  autoview: boolean;
  autolike: boolean;

  // 👇 This line allows dynamic access like features[key]
  [key: string]: boolean | string | undefined;
}


// Single custom command pair
export interface CustomCommand {
  keyword: string;
  response: string;
}

// Full bot settings per user
export interface UserSettings {
  userId: string;
  features: BotFeatures;
  prefix: string;
  mode: 'PUBLIC' | 'PRIVATE';
  blockedUsers: string[];
  customCommands: CustomCommand[];
}

// QR code + session ID response format
export interface QRCodeData {
  qr: string;
  sessionId: string;
}

// Auth return payload
export interface AuthResponse {
  token: string;
  user: ClientUser;
}

// Dashboard load response
export interface DashboardResponse {
  user: ClientUser;
  settings: {
    features: BotFeatures;
    prefix: string;
    mode: 'PUBLIC' | 'PRIVATE';
  };
}

// Baileys session credentials object
export interface BaileysCreds {
  noiseKey: object;
  signedIdentityKey: object;
  signedPreKey: object;
  registrationId: number;
  advSecretKey: string;
  processedHistoryMessages: unknown[];
  nextPreKeyId: number;
  firstUnuploadedPreKeyId: number;
  accountSettings: Record<string, unknown>;
  account: Record<string, unknown>;
  signalIdentities: Array<Record<string, unknown>>;
  lastAccountSyncTimestamp: number;
  myAppStateKeyId: string;
}

// Baileys full session (authState)
export interface BaileysSessionData {
  creds: BaileysCreds;
  keys: Record<string, unknown>;
}

// ✅ Bot Command Interface (for commands like !ping)
export interface BotCommand {
  name: string;
  description: string;
  execute: (sock: WASocket, msg: proto.IWebMessageInfo) => Promise<void>;
}

export interface FeatureHandler {
  name: string;
  enabled?: boolean | (() => boolean);
  handle?: (sock: WASocket, msg: proto.IWebMessageInfo) => Promise<void>;
  register?: (sock: WASocket) => void;
  onReady?: (sock: WASocket) => void;
}
export type { UserSettingsDocument } from '../models/UserSettings.js';
