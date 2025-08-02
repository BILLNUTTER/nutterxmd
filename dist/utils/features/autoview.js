import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';
export const feature = {
    name: 'autoview',
    enabled: () => true,
    handle: async (sock, msg) => {
        const fromStatus = msg.key.remoteJid?.endsWith('@status');
        if (!fromStatus)
            return;
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User.findOne({ phone: sessionPhone });
        if (!sessionUser)
            return;
        const settings = await UserSettings.findOne({ userId: sessionUser._id });
        const isEnabled = settings?.features?.autoview === true;
        if (!isEnabled) {
            console.log('[autoview] 🚫 Disabled for this user.');
            return;
        }
        try {
            await sock.readMessages([msg.key]);
            console.log(`[autoview] ✅ Viewed status from ${msg.key.remoteJid}`);
        }
        catch (err) {
            console.error(`[autoview] ❌ Failed to view status from ${msg.key.remoteJid}:`, err);
        }
    }
};
