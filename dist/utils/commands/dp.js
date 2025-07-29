"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const getSessionUserSettings_js_1 = require("../../utils/getSessionUserSettings.js");
const jimp_1 = __importDefault(require("jimp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const watermark = '\n\n_➤ nutterxmd_';
exports.command = {
    name: 'dp',
    description: 'Download profile picture of a tagged user or replied message sender, then watermark it',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        // Validate session
        const sessionData = await (0, getSessionUserSettings_js_1.getSessionUserSettings)(sock);
        if (!sessionData?.user || !sessionData?.settings) {
            await sock.sendMessage(jid, {
                text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
            });
            return;
        }
        const { prefix } = sessionData.settings;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text.startsWith(prefix))
            return;
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = contextInfo?.mentionedJid || [];
        let targetJid = null;
        if (mentioned.length > 0) {
            targetJid = mentioned[0];
        }
        else if (contextInfo?.participant) {
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
        const id = (0, uuid_1.v4)();
        const tempDir = path_1.default.join(__dirname, '../../temp');
        const outputPath = path_1.default.join(tempDir, `dp-${id}.jpg`);
        fs_1.default.mkdirSync(tempDir, { recursive: true });
        try {
            const image = await jimp_1.default.read(profileUrl);
            const font = await jimp_1.default.loadFont(jimp_1.default.FONT_SANS_16_WHITE);
            const wmText = '| nutterxmd';
            const padding = 10;
            const textWidth = jimp_1.default.measureText(font, wmText);
            const textHeight = jimp_1.default.measureTextHeight(font, wmText, image.getWidth());
            const watermarkImage = new jimp_1.default(textWidth, textHeight, 0x00000000);
            watermarkImage.print(font, 0, 0, wmText).opacity(0.2);
            const x = image.getWidth() - textWidth - padding;
            const y = image.getHeight() - textHeight - padding;
            image.composite(watermarkImage, x, y, {
                mode: jimp_1.default.BLEND_OVERLAY,
                opacitySource: 1,
                opacityDest: 1,
            });
            await image.writeAsync(outputPath);
            const buffer = fs_1.default.readFileSync(outputPath);
            await sock.sendMessage(jid, {
                image: buffer,
                caption: `📷 Profile picture of @${targetJid.split('@')[0]}${watermark}`,
                mentions: [targetJid],
            });
            fs_1.default.unlinkSync(outputPath);
        }
        catch (err) {
            console.error('DP Error:', err);
            await sock.sendMessage(jid, {
                text: `❌ Failed to process profile picture.${watermark}`,
            });
        }
    },
};
