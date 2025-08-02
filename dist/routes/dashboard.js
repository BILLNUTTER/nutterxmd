"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserSettings_js_1 = __importDefault(require("../models/UserSettings.js"));
const User_js_1 = __importDefault(require("../models/User.js"));
const Session_js_1 = __importDefault(require("../models/Session.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Shared fallback default settings
const defaultSettings = (userId, username, phone) => ({
    userId,
    username,
    phone,
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
        autoread: false,
        autoview: false,
        autolike: false,
    },
});
// GET: Dashboard data
router.get('/', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User_js_1.default.findById(userId).select('-password');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        let settings = await UserSettings_js_1.default.findOne({ userId });
        // Auto-create if missing
        if (!settings) {
            settings = await UserSettings_js_1.default.create(defaultSettings(userId, user.username, user.phone));
        }
        const session = await Session_js_1.default.findOne({ userId });
        res.json({
            user,
            settings,
            session,
        });
    }
    catch (error) {
        console.error('❌ Dashboard fetch error:', error);
        res.status(500).json({ message: 'Failed to get dashboard data' });
    }
});
// PATCH: Toggle features or update prefix
router.patch('/features', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { features, prefix } = req.body;
        const user = await User_js_1.default.findById(userId).select('username phone');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const updates = {
            username: user.username,
            phone: user.phone,
        };
        if (features)
            updates.features = features;
        if (prefix)
            updates.prefix = prefix;
        const updated = await UserSettings_js_1.default.findOneAndUpdate({ userId }, updates, { upsert: true, new: true });
        const changes = [];
        if (features) {
            for (const [key, value] of Object.entries(features)) {
                changes.push(`${key} → *${value ? 'enabled' : 'disabled'}*`);
            }
        }
        if (prefix)
            changes.push(`prefix → *${prefix}*`);
        const summaryMessage = `✅ Your settings have been updated:\n\n${changes.map(c => `• ${c}`).join('\n')}`;
        const session = global.activeSessions?.get(userId);
        const jid = `${user.phone}@s.whatsapp.net`;
        if (session?.socket) {
            try {
                await session.socket.sendMessage(jid, { text: summaryMessage });
            }
            catch (err) {
                console.warn(`⚠️ Failed to send WhatsApp update to ${user.username}:`, err);
            }
        }
        res.json({
            message: '✅ Features/settings updated successfully',
            settings: updated
        });
    }
    catch (error) {
        console.error('❌ Feature update error:', error);
        res.status(500).json({ message: 'Failed to update features/settings' });
    }
});
// PATCH: Update prefix & mode
router.patch('/settings', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { prefix, mode } = req.body;
        const user = await User_js_1.default.findById(userId).select('username phone');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const updatedSettings = await UserSettings_js_1.default.findOneAndUpdate({ userId }, {
            prefix,
            mode,
            username: user.username,
            phone: user.phone
        }, { upsert: true, new: true });
        if (prefix) {
            const session = global.activeSessions?.get(userId);
            const jid = `${user.phone}@s.whatsapp.net`;
            if (session?.socket) {
                try {
                    await session.socket.sendMessage(jid, {
                        text: `✅ Your bot command prefix has been updated to: *${prefix}*`,
                    });
                }
                catch (err) {
                    console.warn(`⚠️ Failed to notify user ${userId} on WhatsApp:`, err);
                }
            }
        }
        res.json({
            message: '✅ Settings updated successfully',
            settings: updatedSettings,
        });
    }
    catch (error) {
        console.error('❌ Settings update error:', error);
        res.status(500).json({ message: 'Failed to update settings' });
    }
});
// PATCH: Custom commands
router.patch('/commands', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const { customCommands } = req.body;
        const user = await User_js_1.default.findById(userId).select('username phone');
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const updated = await UserSettings_js_1.default.findOneAndUpdate({ userId }, {
            customCommands,
            username: user.username,
            phone: user.phone
        }, { upsert: true, new: true });
        res.json({
            message: '✅ Custom commands updated successfully',
            settings: updated
        });
    }
    catch (error) {
        console.error('❌ Custom command update error:', error);
        res.status(500).json({ message: 'Failed to update custom commands' });
    }
});
exports.default = router;
