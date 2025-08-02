import { WASocket, proto } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../../shared/types.js';
import {
  getLinkWarning,
  incrementLinkWarning,
  resetLinkWarning,
} from '../../models/LinkWarning.js';
import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';

const WATERMARK = '\n\n_➤ nutterxmd_';
const MAX_WARNINGS = 3;

export const feature: FeatureHandler = {
  name: 'antilink',
  enabled: () => true,

  handle: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
    const sessionPhone = sock.user?.id?.split('@')[0];
    const sessionUser = await User.findOne({ phone: sessionPhone });

    if (!sessionUser) {
      console.log(`[antilink] ❌ No session user found for ${sessionPhone}`);
      return;
    }

    const settings = await UserSettings.findOne({ userId: sessionUser._id });
    if (!settings?.features?.antilink) return;

    const groupId = msg.key.remoteJid!;
    const senderJid = msg.key.participant || msg.key.remoteJid!;
    const messageContent =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    if (!groupId.endsWith('@g.us')) return;

    const linkRegex = /(https?:\/\/|www\.)\S+/gi;
    const containsLink = linkRegex.test(messageContent);
    if (!containsLink) return;

    const warns = await getLinkWarning(groupId, senderJid);

    if (warns + 1 >= MAX_WARNINGS) {
      try {
        await sock.sendMessage(groupId, {
          text: `❌ @${senderJid.split('@')[0]} has been *removed* for sending links multiple times!${WATERMARK}`,
          mentions: [senderJid],
        });

        await sock.groupParticipantsUpdate(groupId, [senderJid], 'remove');
        await resetLinkWarning(groupId, senderJid);
      } catch (err) {
        console.error(`[antilink] ❌ Failed to remove user ${senderJid}:`, err);
      }
    } else {
      await incrementLinkWarning(groupId, senderJid);
      await sock.sendMessage(groupId, {
        text: `⚠️ @${senderJid.split('@')[0]}, sending links is *not allowed* in this group!\n🔢 Warning: ${warns + 1
          }/${MAX_WARNINGS}${WATERMARK}`,
        mentions: [senderJid],
      });
    }
  },
};
