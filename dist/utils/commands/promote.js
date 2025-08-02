import { ADMIN_PHONE } from '../../shared/constants.js';
import { getSessionUserSettings } from '../getSessionUserSettings.js';
const watermark = '\n\n__➤ nutterxmd_';
export const command = {
    name: 'promote',
    description: 'Promote mentioned user(s) to group admin',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const session = await getSessionUserSettings(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || '';
        if (!text.startsWith(prefix + 'promote'))
            return;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const isGroup = jid.endsWith('@g.us');
        const isOwner = ADMIN_PHONE && senderJid.includes(ADMIN_PHONE);
        if (!isGroup) {
            await sock.sendMessage(jid, {
                text: `❌ This command only works in groups.${watermark}`,
            });
            return;
        }
        if (!mentioned.length) {
            await sock.sendMessage(jid, {
                text: `❌ Please tag the user(s) you want to promote.\n\nExample: *${prefix}promote @user*${watermark}`,
                mentions: [senderJid],
            });
            return;
        }
        const metadata = await sock.groupMetadata(jid);
        const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = metadata.participants.some(p => p.id === botId && p.admin !== undefined);
        const isSenderAdmin = metadata.participants.some(p => p.id === senderJid && p.admin !== undefined);
        if (!isBotAdmin) {
            await sock.sendMessage(jid, {
                text: `⚠️ I need to be an admin to promote members.${watermark}`,
            });
            return;
        }
        if (!isSenderAdmin && !isOwner) {
            await sock.sendMessage(jid, {
                text: `🚫 You must be a group admin to use this command.${watermark}`,
            });
            return;
        }
        for (const user of mentioned) {
            const participant = metadata.participants.find(p => p.id === user);
            const isUserAdmin = participant?.admin !== undefined;
            if (isUserAdmin) {
                await sock.sendMessage(jid, {
                    text: `ℹ️ @${user.split('@')[0]} is already an admin.${watermark}`,
                    mentions: [user],
                });
                continue;
            }
            try {
                await sock.groupParticipantsUpdate(jid, [user], 'promote');
                await sock.sendMessage(jid, {
                    text: `⬆️ Promoted @${user.split('@')[0]} to admin.${watermark}`,
                    mentions: [user],
                });
            }
            catch (err) {
                console.error(`❌ Failed to promote ${user}`, err);
                await sock.sendMessage(jid, {
                    text: `❌ Failed to promote @${user.split('@')[0]}.${watermark}`,
                    mentions: [user],
                });
            }
        }
    },
};
