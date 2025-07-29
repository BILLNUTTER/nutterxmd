"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getSessionUserSettings_1 = require("../../utils/getSessionUserSettings");
const WATERMARK = '\n\n_➤ nutterxmd_';
function extractText(msg) {
    return (msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '');
}
function formatMention(jid) {
    return `@${jid.split('@')[0]}`;
}
exports.command = {
    name: 'menu',
    description: 'Show command menu as image and audio with watermark',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        // Load user session + settings
        const session = await (0, getSessionUserSettings_1.getSessionUserSettings)(sock);
        if (!session?.settings) {
            await sock.sendMessage(jid, {
                text: `❌ Bot not registered. Link via dashboard first.${WATERMARK}`,
            });
            return;
        }
        const { prefix } = session.settings;
        const rawText = extractText(msg).trim();
        // Ignore if prefix doesn't match
        if (!rawText.startsWith(prefix))
            return;
        const commandRegex = new RegExp(`^\\${prefix}menu\\s*`, 'i');
        const match = commandRegex.exec(rawText);
        const captionText = match ? rawText.replace(match[0], '').trim() : 'Here is your command list 👇';
        const mention = formatMention(sender.toString());
        const MENU_TEXT = `
🌐 *nutterxmd MENU* 🌐

📍 *GENERAL*
• ${prefix}alive
• ${prefix}menu
• ${prefix}help

📥 *DOWNLOADER*
• ${prefix}play <url>
• ${prefix}sing <url>
• ${prefix}tiktok <url>

🎭 *TAGGING*
• ${prefix}tagall
• ${prefix}hidetag
• ${prefix}tagadmin
• ${prefix}tagactive
• ${prefix}taginactive

🔧 *ADMIN TOOLS*
• ${prefix}mute
• ${prefix}unmute
• ${prefix}kick @user
• ${prefix}promote @user
• ${prefix}demote @user

🕵️ *ANTI-FEATURES*
• ${prefix}antidelete on/off

😂 *FUN & EXTRAS*
• ${prefix}salute
• ${prefix}joke
• ${prefix}quote
• ${prefix}say <text>

🎙️ *VOICE*
• ${prefix}say <text>

📚 *More coming soon...*
https://www.youtube.com/channel/UCK9XxcLkDrsYZddZqbQZ8uA?sub_confirmation=1
${' '.repeat(20)}\n\n_➤ nutterxmd_`;
        const fullCaption = `hey ${mention}, ${captionText}${MENU_TEXT}`;
        const imagePath = path_1.default.resolve('images/juice.jpg');
        const audioPath = path_1.default.resolve('audio/menu.mp3');
        // 🖼️ Send image
        if (fs_1.default.existsSync(imagePath)) {
            const imageBuffer = fs_1.default.readFileSync(imagePath);
            await sock.sendMessage(jid, {
                image: imageBuffer,
                caption: fullCaption,
                mentions: [sender.toString()],
            });
        }
        else {
            await sock.sendMessage(jid, {
                text: `❌ Menu image not found at: images/juice.jpg${WATERMARK}`,
            });
        }
        // 🔊 Send audio
        if (fs_1.default.existsSync(audioPath)) {
            const audioBuffer = fs_1.default.readFileSync(audioPath);
            const thumbBuffer = fs_1.default.existsSync(imagePath) ? fs_1.default.readFileSync(imagePath) : undefined;
            await sock.sendMessage(jid, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: 'nutterxmd',
                        body: '🎧 Voice Menu Guide',
                        mediaType: 2,
                        thumbnail: thumbBuffer,
                        showAdAttribution: true,
                        sourceUrl: 'https://wa.me/254758891491',
                    }
                }
            });
        }
        else {
            await sock.sendMessage(jid, {
                text: `❌ Menu audio not found at: audio/menu.mp3${WATERMARK}`,
            });
        }
    }
};
