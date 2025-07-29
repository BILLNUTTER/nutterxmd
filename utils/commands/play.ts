import { WASocket, proto } from '@whiskeysockets/baileys';
import { BotCommand } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
// @ts-expect-error: yt-search has no TypeScript definitions available
import ytSearch from 'yt-search';
import { getSessionUserSettings } from '../getSessionUserSettings';

const WATERMARK = '_➤ nutterxmd_';

export const command: BotCommand = {
  name: 'play',
  description: '🎵 Play a song from YouTube using search text or tagged user',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo): Promise<void> => {
    const jid = msg.key.remoteJid!;

    // Get dynamic prefix from DB
    const session = await getSessionUserSettings(sock);
    if (!session || !session.settings) return;
    const prefix = session.settings.prefix || '.';

    const rawText =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || '';

    // Exit early if not matching correct command prefix
    if (!rawText.startsWith(prefix + 'play')) return;

    const query = rawText.slice((prefix + 'play').length).trim();

    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let finalQuery = query;

    if (!finalQuery && mentionedJids && mentionedJids.length > 0) {
      const contactJid = mentionedJids[0];
      finalQuery = contactJid.split('@')[0];
    }

    if (!finalQuery) {
      await sock.sendMessage(jid, {
        text: `🎵 Please provide a song name or tag someone.\nExample: *${prefix}play Despacito* or *${prefix}play @user*\n\n${WATERMARK}`
      });
      return;
    }

    await sock.sendMessage(jid, {
      text: `🔍 Searching for: *${finalQuery}*...`
    });

    try {
      const result = await ytSearch(finalQuery);
      const video = result.videos[0];

      if (!video) {
        await sock.sendMessage(jid, {
          text: `❌ No YouTube results found for "${finalQuery}".\n\n${WATERMARK}`
        });
        return;
      }

      const id = uuidv4();
      const tempDir = path.join(__dirname, '../../temp');
      const outputPath = path.join(tempDir, `play-${id}.mp3`);
      fs.mkdirSync(tempDir, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(ytdl(video.url, { quality: 'highestaudio' }))
          .audioBitrate(128)
          .format('mp3')
          .save(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err));
      });

      const audio = fs.readFileSync(outputPath);
      await sock.sendMessage(jid, {
        audio,
        mimetype: 'audio/mp4',
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: video.title,
            body: `⏱ ${video.timestamp} • 🎤 ${video.author.name}`,
            mediaType: 2,
            thumbnailUrl: video.image,
            sourceUrl: video.url,
            showAdAttribution: true,
          }
        }
      });

      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error('Play command error:', err);
      await sock.sendMessage(jid, {
        text: `❌ Failed to play the song. Please try again.\n\n${WATERMARK}`
      });
    }
  }
};
