import { WASocket, proto } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { BotCommand } from '../../shared/types';
import { getSessionUserSettings } from '../getSessionUserSettings';

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
  name: 'test',
  description: 'Send test image with caption and watermark (also works with .alive)',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
    const jid = msg.key.remoteJid!;
    const sender = msg.key.participant || msg.key.remoteJid!;

    const session = await getSessionUserSettings(sock);
    if (!session || !session.settings) return;

    const prefix = session.settings.prefix || '.';
    const rawText = extractText(msg).trim();

    // Only run for .test or .alive command
    const match = new RegExp(`^\\${prefix}(test|alive)\\s*`, 'i').exec(rawText);
    if (!match) return;

    const captionText = rawText.replace(match[0], '').trim() || 'am alive';
    const mention = formatMention(sender.toString());
    const fullCaption = `hey ${mention} ${captionText}${WATERMARK}`;

    const imagePath = path.resolve('images/juice.jpg');

    if (!fs.existsSync(imagePath)) {
      await sock.sendMessage(jid, {
        text: `❌ Image not found at: images/juice.jpg\nMake sure the file exists.${WATERMARK}`
      });
      return;
    }

    const buffer = fs.readFileSync(imagePath);

    await sock.sendMessage(jid, {
      image: buffer,
      caption: fullCaption,
      mentions: [sender.toString()],
    });
  }
};
