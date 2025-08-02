import { getSessionUserSettings } from '../getSessionUserSettings';
const watermark = '_➤ nutterxmd_';
export const command = {
    name: 'owner',
    description: '👑 Get contact info of the bot owner',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        // Load prefix from DB/session
        const session = await getSessionUserSettings(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        // Get full message text
        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || '';
        // Only proceed if message starts with valid prefix
        if (!text.startsWith(prefix + 'owner'))
            return;
        const ownerInfo = `
👑 *Bot Owner Info*

📛 *Name:* Bill Nutter
📧 *Email:* omayiocalvin59@gmail.com
📞 *Phone (Calls):* +254758891491
💬 *WhatsApp:* https://wa.me/254713881613

🟢 *Bot Status:* Running ✅

${watermark}
    `.trim();
        await sock.sendMessage(jid, {
            text: ownerInfo,
            mentions: [sender],
        });
    }
};
