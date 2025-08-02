import { getSessionUserSettings } from '../getSessionUserSettings';
const watermark = '| nutterxmd';
export const command = {
    name: 'mute',
    description: '🚫 Close group (only admins can message)',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isGroup = jid.endsWith('@g.us');
        if (!isGroup) {
            await sock.sendMessage(jid, {
                text: `❌ This command only works in *groups*.\n\n${watermark}`
            });
            return;
        }
        const session = await getSessionUserSettings(sock);
        if (!session || !session.settings)
            return;
        const groupMeta = await sock.groupMetadata(jid);
        const isSenderAdmin = groupMeta.participants.some(p => p.id === senderJid && p.admin !== undefined);
        if (!isSenderAdmin) {
            await sock.sendMessage(jid, {
                text: `❌ Only *group admins* can use this command.\n\n${watermark}`
            });
            return;
        }
        // 🛑 Close group (only admins can message)
        await sock.groupSettingUpdate(jid, 'announcement');
        await sock.sendMessage(jid, {
            text: `🔒 Group has been *closed*. Only *admins* can send messages now.\n\n${watermark}`
        });
    }
};
