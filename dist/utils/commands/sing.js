"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const gtts_1 = __importDefault(require("gtts"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const getSessionUserSettings_1 = require("../getSessionUserSettings");
const WATERMARK = '_➤ nutterxmd_';
exports.command = {
    name: 'sing',
    description: 'Convert text to "singing" with background music',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const session = await (0, getSessionUserSettings_1.getSessionUserSettings)(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';
        if (!text.startsWith(prefix + 'sing'))
            return;
        const args = text.slice((prefix + 'sing').length).trim().split(/\s+/);
        const lyrics = args.join(' ');
        if (!lyrics) {
            await sock.sendMessage(jid, {
                text: `🎵 Please provide lyrics to sing.\nExample: *${prefix}sing Happy birthday to you!*\n\n${WATERMARK}`
            });
            return;
        }
        const id = (0, uuid_1.v4)();
        const tempDir = path_1.default.join(__dirname, '../../temp');
        const ttsPath = path_1.default.join(tempDir, `sing-voice-${id}.mp3`);
        const musicPath = path_1.default.join(__dirname, '../../assets/background.mp3');
        const outputPath = path_1.default.join(tempDir, `sing-${id}.mp3`);
        fs_1.default.mkdirSync(tempDir, { recursive: true });
        const tts = new gtts_1.default(lyrics, 'en');
        tts.save(ttsPath, async (err) => {
            if (err) {
                console.error('TTS Error:', err.message);
                await sock.sendMessage(jid, {
                    text: `❌ Failed to generate singing audio.\n\n${WATERMARK}`
                });
                return;
            }
            (0, fluent_ffmpeg_1.default)()
                .input(musicPath)
                .input(ttsPath)
                .complexFilter('[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2')
                .output(outputPath)
                .on('end', async () => {
                try {
                    const audio = fs_1.default.readFileSync(outputPath);
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
                    fs_1.default.unlinkSync(ttsPath);
                    fs_1.default.unlinkSync(outputPath);
                }
                catch (readErr) {
                    console.error('Send Error:', readErr);
                    await sock.sendMessage(jid, {
                        text: `❌ Failed to send audio.\n\n${WATERMARK}`
                    });
                }
            })
                .on('error', async (ffmpegErr) => {
                console.error('FFmpeg Error:', ffmpegErr.message);
                await sock.sendMessage(jid, {
                    text: `❌ Audio mixing failed.\n\n${WATERMARK}`
                });
            })
                .run();
        });
    },
};
