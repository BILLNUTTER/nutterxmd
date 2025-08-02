// utils/settings/handler.ts
import UserSettings from '../../models/UserSettings';
/**
 * Extracts a consistent user ID from WhatsApp JID.
 * Examples:
 *  - "254712345678@s.whatsapp.net" → "254712345678"
 *  - "254712345678@randomtype.whatsapp.net" → "254712345678"
 */
export const getUserIdByJid = async (jid) => {
    const phone = jid.split('@')[0];
    const settings = await UserSettings.findOne({ phone });
    return settings?.userId || null;
};
/**
 * Get prefix for a specific user (defaults to ".")
 */
export const getUserPrefix = async (userId) => {
    const settings = await UserSettings.findOne({ userId });
    if (!settings)
        throw new Error('User not registered.');
    return settings.prefix;
};
/**
 * Get mode for a specific user (PUBLIC / PRIVATE)
 */
export const getUserMode = async (userId) => {
    const settings = await UserSettings.findOne({ userId });
    return settings?.mode === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
};
