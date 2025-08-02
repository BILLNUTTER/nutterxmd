import { getSessionUserSettings } from '../../utils/getSessionUserSettings';
import { ADMIN_PHONE } from '../../shared/constants';
const watermark = '\n\n_➤ nutterxmd_';
export const command = {
    name: 'kick',
    description: '🚪 Remove mentioned user(s) from group',
    execute: async (sock, msg) => {
        const groupId = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isGroup = groupId.endsWith('@g.us');
        // Validate session + prefix
        const sessionData = await getSessionUserSettings(sock);
        if (!sessionData?.user || !sessionData?.settings) {
            await sock.sendMessage(groupId, {
                text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
            });
            return;
        }
        const { prefix } = sessionData.settings;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text.startsWith(prefix))
            return;
        if (!isGroup) {
            await sock.sendMessage(groupId, {
                text: `❌ This command only works in *groups*.${watermark}`,
            });
            return;
        }
        const metadata = await sock.groupMetadata(groupId);
        const isBotAdmin = metadata.participants.some(p => p.id === sock.user?.id && p.admin !== undefined);
        const isSenderAdmin = metadata.participants.some(p => p.id === senderJid && p.admin !== undefined);
        const isOwner = senderJid.includes(ADMIN_PHONE);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) {
            await sock.sendMessage(groupId, {
                text: `❌ Please *tag* the user(s) you want to kick.\n\n💡 Example: *${prefix}kick @user*${watermark}`,
                mentions: [senderJid],
            });
            return;
        }
        if (!isBotAdmin) {
            await sock.sendMessage(groupId, {
                text: `⚠️ I need to be an *admin* to kick members.${watermark}`,
            });
            return;
        }
        if (!isSenderAdmin && !isOwner) {
            await sock.sendMessage(groupId, {
                text: `🚫 You must be a *group admin* to use this command.${watermark}`,
            });
            return;
        }
        for (const user of mentioned) {
            if (user === sock.user?.id)
                continue; // Don't kick self
            try {
                await sock.groupParticipantsUpdate(groupId, [user], 'remove');
                await sock.sendMessage(groupId, {
                    text: `✅ Removed @${user.split('@')[0]}.${watermark}`,
                    mentions: [user],
                });
            }
            catch (err) {
                console.error(`❌ Failed to kick ${user}`, err);
                await sock.sendMessage(groupId, {
                    text: `❌ Failed to remove @${user.split('@')[0]}.${watermark}`,
                    mentions: [user],
                });
            }
        }
    },
};
