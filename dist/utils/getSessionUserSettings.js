"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionUserSettings = void 0;
const User_js_1 = __importDefault(require("../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../models/UserSettings.js"));
/**
 * 🔐 Get the bot session owner's user and settings (from sock).
 * If settings don't exist, create them with defaults.
 */
const getSessionUserSettings = async (sock) => {
    const sessionPhone = sock.user?.id?.split('@')[0];
    if (!sessionPhone) {
        console.error('❌ No session phone found from sock.user.id');
        return null;
    }
    const user = await User_js_1.default.findOne({ phone: sessionPhone });
    if (!user) {
        console.error(`❌ No user found with phone ${sessionPhone}`);
        return null;
    }
    let settings = await UserSettings_js_1.default.findOne({ userId: user._id });
    if (!settings) {
        settings = await UserSettings_js_1.default.create({
            userId: user._id,
            username: user.username,
            phone: user.phone,
            prefix: '.',
            mode: 'PUBLIC',
            blockedUsers: [],
            features: {
                autoReply: false,
                typingDelay: false,
                groupWelcome: false,
                groupEvents: false,
                scheduledMessages: false,
                referralMessage: false,
                salute: false,
                antilink: false,
                onlineOnlyMode: false,
                paymentReminder: true,
                customCommands: false,
                menuCommand: true,
                blockCommand: false,
                unblockCommand: false,
                presence: 'typing',
                antiDelete: false,
                autobio: false,
            }
        });
        console.log(`[session] 🆕 Created default settings for ${user.username} (${sessionPhone})`);
    }
    return { user, settings };
};
exports.getSessionUserSettings = getSessionUserSettings;
