import { getSessionUserSettings } from '../../utils/getSessionUserSettings.js';
const watermark = '\n\n_➤ nutterxmd_';
export const command = {
    name: 'block',
    description: '🚫 Block or unblock mentioned user(s)',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const sessionData = await getSessionUserSettings(sock);
        if (!sessionData?.user || !sessionData?.settings) {
            await sock.sendMessage(jid, {
                text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
            });
            return;
        }
        const userPrefix = sessionData.settings.prefix;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text.startsWith(userPrefix))
            return;
        const isGroup = jid.endsWith('@g.us');
        if (isGroup) {
            await sock.sendMessage(jid, {
                text: `❗ This command can only be used in *private chat*.${watermark}`,
            });
            return;
        }
        if (!mentioned.length) {
            await sock.sendMessage(jid, {
                text: `❌ Please *tag the user(s)* you want to block or unblock.\n\n💡 Example: *${userPrefix}block @user*${watermark}`,
            });
            return;
        }
        for (const user of mentioned) {
            try {
                const blockList = await sock.fetchBlocklist();
                const alreadyBlocked = blockList.includes(user);
                if (alreadyBlocked) {
                    await sock.updateBlockStatus(user, 'unblock');
                    await sock.sendMessage(jid, {
                        text: `✅ Unblocked @${user.split('@')[0]}.${watermark}`,
                        mentions: [user],
                    });
                }
                else {
                    await sock.updateBlockStatus(user, 'block');
                    await sock.sendMessage(jid, {
                        text: `✅ Blocked @${user.split('@')[0]}.${watermark}`,
                        mentions: [user],
                    });
                }
            }
            catch (err) {
                console.error(`❌ Failed to block/unblock ${user}`, err);
                await sock.sendMessage(jid, {
                    text: `❌ Could not block/unblock @${user.split('@')[0]} due to an error.${watermark}`,
                    mentions: [user],
                });
            }
        }
    },
};
