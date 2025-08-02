import User from '../../models/User';
import UserSettings from '../../models/UserSettings';
export const feature = {
    name: 'autolike',
    enabled: () => true,
    handle: async (sock, msg) => {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User.findOne({ phone: sessionPhone });
        if (!sessionUser)
            return;
        const settings = await UserSettings.findOne({ userId: sessionUser._id });
        const isEnabled = settings?.features?.autolike === true;
        if (!isEnabled) {
            console.log('[autolike] ❌ Autolike is disabled');
            return;
        }
        const isStatus = msg.key.remoteJid === 'status@broadcast';
        if (!isStatus)
            return;
        try {
            await sock.sendMessage('status@broadcast', {
                react: {
                    text: '❤️',
                    key: msg.key,
                },
            });
            console.log('[autolike] ✅ Reacted with ❤️ to a status');
        }
        catch (err) {
            console.error('[autolike] ❌ Failed to react to status:', err);
        }
    },
};
