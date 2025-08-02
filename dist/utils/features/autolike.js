"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const User_1 = __importDefault(require("../../models/User"));
const UserSettings_1 = __importDefault(require("../../models/UserSettings"));
exports.feature = {
    name: 'autolike',
    enabled: () => true,
    handle: async (sock, msg) => {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User_1.default.findOne({ phone: sessionPhone });
        if (!sessionUser)
            return;
        const settings = await UserSettings_1.default.findOne({ userId: sessionUser._id });
        const isEnabled = settings?.features?.autolike === true;
        if (!isEnabled) {
            console.log('[autolike] ❌ Autolike is disabled');
            return;
        }
        const isStatus = msg.key.remoteJid === 'status@broadcast';
        if (!isStatus)
            return;
        try {
            await sock.sendMessage('status@broadcast', {
                react: {
                    text: '❤️',
                    key: msg.key,
                },
            });
            console.log('[autolike] ✅ Reacted with ❤️ to a status');
        }
        catch (err) {
            console.error('[autolike] ❌ Failed to react to status:', err);
        }
    },
};
