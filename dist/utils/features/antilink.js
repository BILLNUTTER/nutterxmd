"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const LinkWarning_1 = require("../../models/LinkWarning");
const User_1 = __importDefault(require("../../models/User"));
const UserSettings_1 = __importDefault(require("../../models/UserSettings"));
const WATERMARK = '\n\n_➤ nutterxmd_';
const MAX_WARNINGS = 3;
exports.feature = {
    name: 'antilink',
    enabled: () => true,
    handle: async (sock, msg) => {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User_1.default.findOne({ phone: sessionPhone });
        if (!sessionUser) {
            console.log(`[antilink] ❌ No session user found for ${sessionPhone}`);
            return;
        }
        const settings = await UserSettings_1.default.findOne({ userId: sessionUser._id });
        if (!settings?.features?.antilink)
            return;
        const groupId = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!groupId.endsWith('@g.us'))
            return;
        const linkRegex = /(https?:\/\/|www\.)\S+/gi;
        const containsLink = linkRegex.test(messageContent);
        if (!containsLink)
            return;
        const warns = await (0, LinkWarning_1.getLinkWarning)(groupId, senderJid);
        if (warns + 1 >= MAX_WARNINGS) {
            try {
                await sock.sendMessage(groupId, {
                    text: `❌ @${senderJid.split('@')[0]} has been *removed* for sending links multiple times!${WATERMARK}`,
                    mentions: [senderJid],
                });
                await sock.groupParticipantsUpdate(groupId, [senderJid], 'remove');
                await (0, LinkWarning_1.resetLinkWarning)(groupId, senderJid);
            }
            catch (err) {
                console.error(`[antilink] ❌ Failed to remove user ${senderJid}:`, err);
            }
        }
        else {
            await (0, LinkWarning_1.incrementLinkWarning)(groupId, senderJid);
            await sock.sendMessage(groupId, {
                text: `⚠️ @${senderJid.split('@')[0]}, sending links is *not allowed* in this group!\n🔢 Warning: ${warns + 1}/${MAX_WARNINGS}${WATERMARK}`,
                mentions: [senderJid],
            });
        }
    },
};
