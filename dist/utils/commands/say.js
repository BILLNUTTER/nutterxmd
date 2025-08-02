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
const getSessionUserSettings_1 = require("../getSessionUserSettings");
const WATERMARK = '_➤ nutterxmd_';
exports.command = {
    name: 'say',
    description: 'Convert text to speech and send as audio',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const session = await (0, getSessionUserSettings_1.getSessionUserSettings)(sock);
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
        const id = (0, uuid_1.v4)();
        const tempDir = path_1.default.join(__dirname, '../../temp');
        const ttsPath = path_1.default.join(tempDir, `say-${id}.mp3`);
        fs_1.default.mkdirSync(tempDir, { recursive: true });
        const tts = new gtts_1.default(sayMessage, 'en');
        tts.save(ttsPath, async (err) => {
            if (err) {
                console.error('TTS Error:', err);
                await sock.sendMessage(jid, {
                    text: `❌ Failed to generate audio.\n\n${WATERMARK}`
                });
                return;
            }
            try {
                const audio = fs_1.default.readFileSync(ttsPath);
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
                fs_1.default.unlinkSync(ttsPath);
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
