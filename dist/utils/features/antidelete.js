"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const messageCache_1 = require("../messageCache");
const User_js_1 = __importDefault(require("../../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../../models/UserSettings.js"));
const WATERMARK = '\n\n' + ' '.repeat(30) + '| nutterxmd';
exports.feature = {
    name: 'antidelete',
    enabled: () => true, // Always load; use settings check below
    handle: async (sock, msg) => {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User_js_1.default.findOne({ phone: sessionPhone });
        if (!sessionUser) {
            console.log(`[antidelete] ❌ No session user found for ${sessionPhone}`);
            return;
        }
        const settings = await UserSettings_js_1.default.findOne({ userId: sessionUser._id });
        // ⛔ Feature disabled for this user
        if (!settings?.features?.antiDelete) {
            return;
        }
        const protocolMsg = msg.message?.protocolMessage;
        if (!protocolMsg || protocolMsg.type !== 0)
            return;
        const remoteJid = msg.key?.remoteJid;
        const deletedKey = protocolMsg.key;
        const messageId = deletedKey?.id;
        const fromId = deletedKey?.participant || deletedKey?.remoteJid;
        if (!remoteJid || !messageId || !fromId)
            return;
        const original = (0, messageCache_1.getCachedMessage)(remoteJid, messageId);
        if (!original?.message)
            return;
        const senderTag = `@${fromId.split('@')[0]}`;
        const header = `🔥 *nutterxmd ANTIDELETE* 🔥\n`;
        const deletedBy = `🧨 *Deleted by:* ${senderTag}`;
        const mentions = [fromId];
        const msgContent = original.message;
        try {
            const quoted = { key: original.key, message: msgContent };
            const getMediaBuffer = async () => await (0, baileys_1.downloadMediaMessage)(quoted, 'buffer', {
                // @ts-expect-error: reuploadRequest exists at runtime but is not in types
                reuploadRequest: sock.fetchMessagesFromWA,
            });
            if (msgContent.imageMessage?.mimetype) {
                const buffer = await getMediaBuffer();
                await sock.sendMessage(remoteJid, {
                    image: buffer,
                    mimetype: msgContent.imageMessage.mimetype,
                    caption: `${header}${deletedBy}\n\n🖼️ *Recovered deleted image!*${WATERMARK}`,
                    mentions,
                });
            }
            else if (msgContent.videoMessage?.mimetype) {
                const buffer = await getMediaBuffer();
                await sock.sendMessage(remoteJid, {
                    video: buffer,
                    mimetype: msgContent.videoMessage.mimetype,
                    caption: `${header}${deletedBy}\n\n🎞️ *Recovered deleted video!*${WATERMARK}`,
                    mentions,
                });
            }
            else if (msgContent.documentMessage?.mimetype) {
                const buffer = await getMediaBuffer();
                await sock.sendMessage(remoteJid, {
                    document: buffer,
                    mimetype: msgContent.documentMessage.mimetype,
                    fileName: msgContent.documentMessage.fileName ?? 'file',
                    caption: `${header}${deletedBy}\n\n📄 *Recovered deleted document!*${WATERMARK}`,
                    mentions,
                });
            }
            else if (msgContent.audioMessage?.mimetype) {
                const buffer = await getMediaBuffer();
                await sock.sendMessage(remoteJid, {
                    audio: buffer,
                    mimetype: msgContent.audioMessage.mimetype,
                    ptt: msgContent.audioMessage.ptt ?? false,
                });
                await sock.sendMessage(remoteJid, {
                    text: `${header}${deletedBy}\n\n🎧 *Recovered deleted audio!*${WATERMARK}`,
                    mentions,
                });
            }
            else if (msgContent.stickerMessage) {
                const buffer = await getMediaBuffer();
                await sock.sendMessage(remoteJid, {
                    sticker: buffer,
                });
                await sock.sendMessage(remoteJid, {
                    text: `${header}${deletedBy}\n\n🎟️ *Recovered deleted sticker!*${WATERMARK}`,
                    mentions,
                });
            }
            else {
                const text = msgContent.conversation ||
                    msgContent.extendedTextMessage?.text ||
                    '[Text message unavailable]';
                await sock.sendMessage(remoteJid, {
                    text: `${header}${deletedBy}\n\n💬 *Message:*\n${text}${WATERMARK}`,
                    mentions,
                });
            }
        }
        catch (err) {
            console.error('❌ Failed to recover deleted message:', err);
        }
    },
};
