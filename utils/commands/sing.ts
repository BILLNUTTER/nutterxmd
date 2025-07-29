import { WASocket, proto } from '@whiskeysockets/baileys';
import { BotCommand } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import gTTS from 'gtts';
import ffmpeg from 'fluent-ffmpeg';
import { getSessionUserSettings } from '../getSessionUserSettings';

const WATERMARK = '_➤ nutterxmd_';

export const command: BotCommand = {
  name: 'sing',
  description: 'Convert text to "singing" with background music',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo): Promise<void> => {
    const jid = msg.key.remoteJid!;

    const session = await getSessionUserSettings(sock);
    if (!session || !session.settings) return;
    const prefix = session.settings.prefix || '.';

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    if (!text.startsWith(prefix + 'sing')) return;

    const args = text.slice((prefix + 'sing').length).trim().split(/\s+/);
    const lyrics = args.join(' ');

    if (!lyrics) {
      await sock.sendMessage(jid, {
        text: `🎵 Please provide lyrics to sing.\nExample: *${prefix}sing Happy birthday to you!*\n\n${WATERMARK}`
      });
      return;
    }

    const id = uuidv4();
    const tempDir = path.join(__dirname, '../../temp');
    const ttsPath = path.join(tempDir, `sing-voice-${id}.mp3`);
    const musicPath = path.join(__dirname, '../../assets/background.mp3');
    const outputPath = path.join(tempDir, `sing-${id}.mp3`);

    fs.mkdirSync(tempDir, { recursive: true });

    const tts = new gTTS(lyrics, 'en');

    tts.save(ttsPath, async (err: Error | null): Promise<void> => {
      if (err) {
        console.error('TTS Error:', err.message);
        await sock.sendMessage(jid, {
          text: `❌ Failed to generate singing audio.\n\n${WATERMARK}`
        });
        return;
      }

      ffmpeg()
        .input(musicPath)
        .input(ttsPath)
        .complexFilter('[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2')
        .output(outputPath)
        .on('end', async (): Promise<void> => {
          try {
            const audio = fs.readFileSync(outputPath);
            await sock.sendMessage(jid, {
              audio,
              mimetype: 'audio/mp4',
              ptt: true,
              contextInfo: {
                externalAdReply: {
                  title: '| nutterxmd',
                  body: '',
                  mediaType: 2,
                  showAdAttribution: true,
                  sourceUrl: 'https://wa.me/254758891491',
                }
              }
            });

            fs.unlinkSync(ttsPath);
            fs.unlinkSync(outputPath);
          } catch (readErr: unknown) {
            console.error('Send Error:', readErr);
            await sock.sendMessage(jid, {
              text: `❌ Failed to send audio.\n\n${WATERMARK}`
            });
          }
        })
        .on('error', async (ffmpegErr: Error): Promise<void> => {
          console.error('FFmpeg Error:', ffmpegErr.message);
          await sock.sendMessage(jid, {
            text: `❌ Audio mixing failed.\n\n${WATERMARK}`
          });
        })
        .run();
    });
  },
};
