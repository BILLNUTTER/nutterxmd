import { WASocket, proto } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { BotCommand } from '../../shared/types';
import { getSessionUserSettings } from '../../utils/getSessionUserSettings';

const WATERMARK = '\n\n_➤ nutterxmd_';

function extractText(msg: proto.IWebMessageInfo): string {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  );
}

function formatMention(jid: string): string {
  return `@${jid.split('@')[0]}`;
}

export const command: BotCommand = {
  name: 'menu',
  description: 'Show command menu as image and audio with watermark',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
    const jid = msg.key.remoteJid!;
    const sender = msg.key.participant || msg.key.remoteJid!;

    // Load user session + settings
    const session = await getSessionUserSettings(sock);
    if (!session?.settings) {
      await sock.sendMessage(jid, {
        text: `❌ Bot not registered. Link via dashboard first.${WATERMARK}`,
      });
      return;
    }

    const { prefix } = session.settings;
    const rawText = extractText(msg).trim();

    // Ignore if prefix doesn't match
    if (!rawText.startsWith(prefix)) return;

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

    const imagePath = path.resolve('images/juice.jpg');
    const audioPath = path.resolve('audio/menu.mp3');

    // 🖼️ Send image
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      await sock.sendMessage(jid, {
        image: imageBuffer,
        caption: fullCaption,
        mentions: [sender.toString()],
      });
    } else {
      await sock.sendMessage(jid, {
        text: `❌ Menu image not found at: images/juice.jpg${WATERMARK}`,
      });
    }

    // 🔊 Send audio
    if (fs.existsSync(audioPath)) {
      const audioBuffer = fs.readFileSync(audioPath);
      const thumbBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined;

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
    } else {
      await sock.sendMessage(jid, {
        text: `❌ Menu audio not found at: audio/menu.mp3${WATERMARK}`,
      });
    }
  }
};
