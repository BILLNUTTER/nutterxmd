import { getRecentMessages } from '../messageCache.js';
import { getSessionUserSettings } from '../getSessionUserSettings.js';
const WATERMARK = '\n\n_➤ nutterxmd_';
function extractText(msg) {
    return (msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '');
}
function formatJid(jid) {
    return `@${jid.split('@')[0]}`;
}
function numberedList(jids) {
    return jids.map((jid, i) => `${i + 1}. ${formatJid(jid)}`).join('\n');
}
export const command = {
    name: 'tag',
    description: 'Group tagging commands: tagall, hidetag, tagadmin, tagactive, taginactive',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const senderName = msg.pushName || 'Someone mysterious';
        const session = await getSessionUserSettings(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        const text = extractText(msg);
        if (!text.startsWith(prefix))
            return;
        if (!jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, {
                text: `🚫 This command is for groups only! No solo flexing allowed.${WATERMARK}`
            });
            return;
        }
        const [cmd, ...rest] = text.slice(prefix.length).trim().split(/\s+/);
        const message = rest.join(' ').trim() || 'Yo!👋 Who’s awake in here?';
        const metadata = await sock.groupMetadata(jid);
        const participants = metadata.participants || [];
        const mentions = participants.map(p => p.id);
        switch (cmd) {
            case 'tag':
            case 'tagall': {
                const tagText = `📢 *${senderName} just yelled:*\n\n💬 ${message}\n\n👥 *Tagging everyone:*\n${numberedList(mentions)}${WATERMARK}`;
                await sock.sendMessage(jid, { text: tagText, mentions });
                break;
            }
            case 'hidetag': {
                await sock.sendMessage(jid, {
                    text: `🙈 (Stealth Mode Activated)\n💬 ${message}${WATERMARK}`,
                    mentions
                });
                break;
            }
            case 'tagadmin': {
                const admins = participants.filter(p => p.admin !== null);
                const adminMentions = admins.map(p => p.id);
                const adminList = numberedList(adminMentions) || '🤷‍♂️ Uh-oh... No admins? This group is wild.';
                await sock.sendMessage(jid, {
                    text: `🛡️ *Summoning the Admin Overlords:*\n\n${adminList}\n\n🎙️ Hand over the mic to them now!${WATERMARK}`,
                    mentions: adminMentions
                });
                break;
            }
            case 'tagactive': {
                const recentMessages = getRecentMessages(jid) || [];
                const threshold = Date.now() - 30 * 60 * 1000;
                const activeSenders = new Set(recentMessages
                    .filter((m) => m.timestamp >= threshold)
                    .map((m) => m.sender));
                const active = participants.filter(p => activeSenders.has(p.id));
                const activeMentions = active.map(p => p.id);
                const activeList = numberedList(activeMentions) || '😴 Everyone is ghosting right now.';
                await sock.sendMessage(jid, {
                    text: `⚡ *Active Members (last 30 mins):*\n${activeList}${WATERMARK}`,
                    mentions: activeMentions
                });
                break;
            }
            case 'taginactive': {
                const recentMessages = getRecentMessages(jid) || [];
                const threshold = Date.now() - 30 * 60 * 1000;
                const activeSenders = new Set(recentMessages
                    .filter((m) => m.timestamp >= threshold)
                    .map((m) => m.sender));
                const inactive = participants.filter(p => !activeSenders.has(p.id));
                const inactiveMentions = inactive.map(p => p.id);
                const inactiveList = numberedList(inactiveMentions) || '✅ Wow, everyone’s actually active for once!';
                await sock.sendMessage(jid, {
                    text: `😴 *People Who’ve Gone MIA (30 mins+):*\n${inactiveList}${WATERMARK}`,
                    mentions: inactiveMentions
                });
                break;
            }
            default: {
                await sock.sendMessage(jid, {
                    text: `❓ Unknown subcommand, buddy.\nTry one of these:\n\n🔹 *${prefix}tagall*\n🔹 *hidetag*\n🔹 *tagadmin*\n🔹 *tagactive*\n🔹 *taginactive*${WATERMARK}`
                });
                break;
            }
        }
    }
};
