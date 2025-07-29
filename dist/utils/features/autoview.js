"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const User_1 = __importDefault(require("../../models/User"));
const UserSettings_1 = __importDefault(require("../../models/UserSettings"));
exports.feature = {
    name: 'autoview',
    enabled: () => true,
    handle: async (sock, msg) => {
        const fromStatus = msg.key.remoteJid?.endsWith('@status');
        if (!fromStatus)
            return;
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User_1.default.findOne({ phone: sessionPhone });
        if (!sessionUser)
            return;
        const settings = await UserSettings_1.default.findOne({ userId: sessionUser._id });
        const isEnabled = settings?.features?.autoview === true;
        if (!isEnabled) {
            console.log('[autoview] 🚫 Disabled for this user.');
            return;
        }
        try {
            await sock.readMessages([msg.key]);
            console.log(`[autoview] ✅ Viewed status from ${msg.key.remoteJid}`);
        }
        catch (err) {
            console.error(`[autoview] ❌ Failed to view status from ${msg.key.remoteJid}:`, err);
        }
    }
};
