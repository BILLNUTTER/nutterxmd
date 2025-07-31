"use strict";
// utils/settings/handler.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserMode = exports.getUserPrefix = exports.getUserIdByJid = void 0;
const UserSettings_1 = __importDefault(require("../../models/UserSettings"));
/**
 * Extracts a consistent user ID from WhatsApp JID.
 * Examples:
 *  - "254712345678@s.whatsapp.net" → "254712345678"
 *  - "254712345678@randomtype.whatsapp.net" → "254712345678"
 */
const getUserIdByJid = async (jid) => {
    const phone = jid.split('@')[0];
    const settings = await UserSettings_1.default.findOne({ phone });
    return settings?.userId || null;
};
exports.getUserIdByJid = getUserIdByJid;
/**
 * Get prefix for a specific user (defaults to ".")
 */
const getUserPrefix = async (userId) => {
    const settings = await UserSettings_1.default.findOne({ userId });
    if (!settings)
        throw new Error('User not registered.');
    return settings.prefix;
};
exports.getUserPrefix = getUserPrefix;
/**
 * Get mode for a specific user (PUBLIC / PRIVATE)
 */
const getUserMode = async (userId) => {
    const settings = await UserSettings_1.default.findOne({ userId });
    return settings?.mode === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
};
exports.getUserMode = getUserMode;
