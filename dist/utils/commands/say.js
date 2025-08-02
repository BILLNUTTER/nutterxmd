import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import gTTS from 'gtts';
import { getSessionUserSettings } from '../getSessionUserSettings';
const WATERMARK = '_➤ nutterxmd_';
export const command = {
    name: 'say',
    description: 'Convert text to speech and send as audio',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const session = await getSessionUserSettings(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        const rawText = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';
        if (!rawText.startsWith(prefix + 'say'))
            return;
        const args = rawText.slice((prefix + 'say').length).trim().split(/\s+/);
        const sayMessage = args.join(' ');
        if (!sayMessage) {
            await sock.sendMessage(jid, {
                text: `❗ Please provide a message to convert to audio.\nExample: *${prefix}say Hello world!*\n\n${WATERMARK}`
            });
            return;
        }
        const id = uuidv4();
        const tempDir = path.join(__dirname, '../../temp');
        const ttsPath = path.join(tempDir, `say-${id}.mp3`);
        fs.mkdirSync(tempDir, { recursive: true });
        const tts = new gTTS(sayMessage, 'en');
        tts.save(ttsPath, async (err) => {
            if (err) {
                console.error('TTS Error:', err);
                await sock.sendMessage(jid, {
                    text: `❌ Failed to generate audio.\n\n${WATERMARK}`
                });
                return;
            }
            try {
                const audio = fs.readFileSync(ttsPath);
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
                            sourceUrl: 'https://wa.me/254758891491'
                        }
                    }
                });
                fs.unlinkSync(ttsPath);
            }
            catch (readErr) {
                console.error('Read Error:', readErr);
                await sock.sendMessage(jid, {
                    text: `❌ Failed to send audio.\n\n${WATERMARK}`
                });
            }
        });
    },
};
