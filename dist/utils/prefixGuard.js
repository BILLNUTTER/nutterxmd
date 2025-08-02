import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';
/**
 * Strictly fetch the registered prefix for the current session.
 * If no user/settings found, returns `null` to enforce NO fallback.
 */
export async function getUserPrefix(sock) {
    const sessionPhone = sock.user?.id?.split('@')[0];
    if (!sessionPhone)
        return null;
    const sessionUser = await User.findOne({ phone: sessionPhone });
    if (!sessionUser)
        return null;
    const settings = await UserSettings.findOne({ userId: sessionUser._id });
    return settings?.prefix ?? null; // 👈 no fallback
}
/**
 * Extracts the command name from the message if prefix matches.
 * Returns `null` if prefix doesn't match.
 */
export function extractCommandText(text, prefix) {
    if (!text.startsWith(prefix))
        return null;
    const command = text.slice(prefix.length).trim().split(' ')[0].toLowerCase();
    return command || null;
}
