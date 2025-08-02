"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const User_1 = __importDefault(require("../../models/User"));
const UserSettings_1 = __importDefault(require("../../models/UserSettings"));
const WATERMARK = '\n\n_➤ nutterxmd_';
exports.feature = {
    name: 'autoread',
    enabled: () => true,
    handle: async (sock, msg) => {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User_1.default.findOne({ phone: sessionPhone });
        if (!sessionUser) {
            console.log(`[autoread] ❌ No session user for ${sessionPhone}${WATERMARK}`);
            return;
        }
        const settings = await UserSettings_1.default.findOne({ userId: sessionUser._id });
        if (!settings?.features?.autoread) {
            console.log(`[autoread] ❌ Disabled for ${sessionPhone}${WATERMARK}`);
            return;
        }
        const remoteJid = msg.key.remoteJid;
        const messageId = msg.key.id;
        if (!remoteJid || !messageId)
            return;
        try {
            await sock.readMessages([msg.key]);
        }
        catch (err) {
            console.error(`[autoread] ❌ Failed to mark as read:`, err);
        }
    },
};
