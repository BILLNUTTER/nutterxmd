import { WASocket, proto } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../../shared/types';
import User from '../../models/User';
import UserSettings from '../../models/UserSettings';

const WATERMARK = '\n\n_➤ nutterxmd_';

export const feature: FeatureHandler = {
    name: 'autoread',

    enabled: () => true,

    handle: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User.findOne({ phone: sessionPhone });

        if (!sessionUser) {
            console.log(`[autoread] ❌ No session user for ${sessionPhone}${WATERMARK}`);
            return;
        }

        const settings = await UserSettings.findOne({ userId: sessionUser._id });

        if (!settings?.features?.autoread) {
            console.log(`[autoread] ❌ Disabled for ${sessionPhone}${WATERMARK}`);
            return;
        }

        const remoteJid = msg.key.remoteJid;
        const messageId = msg.key.id;

        if (!remoteJid || !messageId) return;

        try {
            await sock.readMessages([msg.key]);
        } catch (err) {
            console.error(`[autoread] ❌ Failed to mark as read:`, err);
        }
    },
};
