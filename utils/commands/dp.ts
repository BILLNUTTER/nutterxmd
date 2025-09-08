import { WASocket, proto } from '@whiskeysockets/baileys';
import { BotCommand } from '../../shared/types.js';
import { getSessionUserSettings } from '../../utils/getSessionUserSettings.js';
import {
  read,
  loadFont,
  FONT_SANS_16_WHITE,
  BLEND_OVERLAY,
  measureText,
  measureTextHeight,
  Jimp
} from 'jimp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const watermark = '\n\n_➤ nutterxmd_';

export const command: BotCommand = {
  name: 'dp',
  description: 'Download profile picture of a tagged user or replied message sender, then watermark it',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo): Promise<void> => {
    const jid = msg.key.remoteJid!;

    // Validate session
    const sessionData = await getSessionUserSettings(sock);
    if (!sessionData?.user || !sessionData?.settings) {
      await sock.sendMessage(jid, {
        text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
      });
      return;
    }

    const { prefix } = sessionData.settings;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!text.startsWith(prefix)) return;

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = contextInfo?.mentionedJid || [];

    let targetJid: string | null = null;
    if (mentioned.length > 0) {
      targetJid = mentioned[0];
    } else if (contextInfo?.participant) {
      targetJid = contextInfo.participant;
    }

    if (!targetJid) {
      await sock.sendMessage(jid, {
        text: `❗ Please tag or reply to a user to fetch their profile picture.\n\n💡 Example:\n*Reply:* ${prefix}dp\n*Mention:* ${prefix}dp @2547xxxxxxx${watermark}`,
      });
      return;
    }

    const profileUrl = await sock.profilePictureUrl(targetJid, 'image');
    if (!profileUrl) {
      await sock.sendMessage(jid, {
        text: `❌ Could not fetch profile picture. The user might not have one or it’s private.${watermark}`,
      });
      return;
    }

    const id = uuidv4();
    const tempDir = path.join(__dirname, '../../temp');
    const outputPath = path.join(tempDir, `dp-${id}.jpg`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const image = await read(profileUrl);
      const font = await loadFont(FONT_SANS_16_WHITE);

      const wmText = '| nutterxmd';
      const padding = 10;
      const textWidth = measureText(font, wmText);
      const textHeight = measureTextHeight(font, wmText, image.getWidth());

      const watermarkImage = await new Jimp({ width: textWidth, height: textHeight, color: 0x00000000 });
      watermarkImage.print(font, 0, 0, wmText).opacity(0.2);

      const x = image.getWidth() - textWidth - padding;
      const y = image.getHeight() - textHeight - padding;
      image.composite(watermarkImage, x, y, {
        mode: BLEND_OVERLAY,
        opacitySource: 1,
        opacityDest: 1,
      });

      await image.write(outputPath);
      const buffer = fs.readFileSync(outputPath);

      await sock.sendMessage(jid, {
        image: buffer,
        caption: `📷 Profile picture of @${targetJid.split('@')[0]}${watermark}`,
        mentions: [targetJid],
      });

      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error('DP Error:', err);
      await sock.sendMessage(jid, {
        text: `❌ Failed to process profile picture.${watermark}`,
      });
    }
  },
};
