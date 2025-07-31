"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getSessionUserSettings_1 = require("../getSessionUserSettings");
const WATERMARK = '\n\n_➤ nutterxmd_';
function extractText(msg) {
    return (msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '');
}
function formatMention(jid) {
    return `@${jid.split('@')[0]}`;
}
exports.command = {
    name: 'test',
    description: 'Send test image with caption and watermark (also works with .alive)',
    execute: async (sock, msg) => {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const session = await (0, getSessionUserSettings_1.getSessionUserSettings)(sock);
        if (!session || !session.settings)
            return;
        const prefix = session.settings.prefix || '.';
        const rawText = extractText(msg).trim();
        // Only run for .test or .alive command
        const match = new RegExp(`^\\${prefix}(test|alive)\\s*`, 'i').exec(rawText);
        if (!match)
            return;
        const captionText = rawText.replace(match[0], '').trim() || 'am alive';
        const mention = formatMention(sender.toString());
        const fullCaption = `hey ${mention} ${captionText}${WATERMARK}`;
        const imagePath = path_1.default.resolve('images/juice.jpg');
        if (!fs_1.default.existsSync(imagePath)) {
            await sock.sendMessage(jid, {
                text: `❌ Image not found at: images/juice.jpg\nMake sure the file exists.${WATERMARK}`
            });
            return;
        }
        const buffer = fs_1.default.readFileSync(imagePath);
        await sock.sendMessage(jid, {
            image: buffer,
            caption: fullCaption,
            mentions: [sender.toString()],
        });
    }
};
