import { WASocket, proto } from '@whiskeysockets/baileys';
import { BotCommand } from '../../shared/types.js';
import { getSessionUserSettings } from '../../utils/getSessionUserSettings.js';

const botStartTime = Date.now();

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

const emojis = ['😎', '🚀', '💥', '🔥', '🤖', '✨', '🧠', '🌀', '🎉', '🍀', '🧃', '👽', '👾'];

export const command: BotCommand = {
  name: 'ping',
  description: 'Check if the bot is alive',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo): Promise<void> => {
    const jid = msg.key.remoteJid!;
    const watermark = '\n\n_➤ nutterxmd_';

    // 🧠 Get session user and settings
    const sessionData = await getSessionUserSettings(sock);

    if (!sessionData?.user || !sessionData?.settings) {
      await sock.sendMessage(jid, {
        text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
      });
      return;
    }

    const { settings } = sessionData;
    const userPrefix = settings.prefix;

    // Check if the message used the correct prefix
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!text.startsWith(userPrefix)) {
      return; // 👈 wrong prefix — do not respond
    }

    // ✅ Initial confirmation
    await sock.sendMessage(jid, {
      text: `🏓 *Pong!* I'm alive and kicking!${watermark}`,
    });

    // 🔁 Animated response
    const sent = await sock.sendMessage(jid, {
      text: `🔄${watermark}`,
    });

    if (!sent?.key) return;

    for (let i = 0; i < 4; i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      await new Promise((res) => setTimeout(res, 500));
      await sock.sendMessage(jid, {
        edit: sent.key,
        text: `✨ ${emoji} ✨${watermark}`,
      });
    }

    const finalEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    await new Promise((res) => setTimeout(res, 500));
    await sock.sendMessage(jid, {
      edit: sent.key,
      text: `🎯 ${finalEmoji} *All systems go!*${watermark}`,
    });

    const uptime = formatUptime(Date.now() - botStartTime);

    await sock.sendMessage(jid, {
      text: `⏱️ *Bot Uptime:* \`${uptime}\`\n📎 *Your Prefix:* \`${userPrefix}\`${watermark}`,
    });
  },
};
