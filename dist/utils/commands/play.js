"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
// @ts-expect-error: yt-search has no TypeScript definitions available
const yt_search_1 = __importDefault(require("yt-search"));
const getSessionUserSettings_1 = require("../getSessionUserSettings");
const WATERMARK = '_➤ nutterxmd_';
exports.command = {
    name: 'play',
    description: '🎵 Play a song from YouTube using search text or tagged user',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        // Get dynamic prefix from DB
        const session = await (0, getSessionUserSettings_1.getSessionUserSettings)(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        const rawText = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || '';
        // Exit early if not matching correct command prefix
        if (!rawText.startsWith(prefix + 'play'))
            return;
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
            const result = await (0, yt_search_1.default)(finalQuery);
            const video = result.videos[0];
            if (!video) {
                await sock.sendMessage(jid, {
                    text: `❌ No YouTube results found for "${finalQuery}".\n\n${WATERMARK}`
                });
                return;
            }
            const id = (0, uuid_1.v4)();
            const tempDir = path_1.default.join(__dirname, '../../temp');
            const outputPath = path_1.default.join(tempDir, `play-${id}.mp3`);
            fs_1.default.mkdirSync(tempDir, { recursive: true });
            await new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)((0, ytdl_core_1.default)(video.url, { quality: 'highestaudio' }))
                    .audioBitrate(128)
                    .format('mp3')
                    .save(outputPath)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err));
            });
            const audio = fs_1.default.readFileSync(outputPath);
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
            fs_1.default.unlinkSync(outputPath);
        }
        catch (err) {
            console.error('Play command error:', err);
            await sock.sendMessage(jid, {
                text: `❌ Failed to play the song. Please try again.\n\n${WATERMARK}`
            });
        }
    }
};
