"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSettingsSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String },
    // 📞 Required to ensure tracking per user
    phone: { type: String, required: true },
    prefix: { type: String, default: '.' },
    mode: {
        type: String,
        enum: ['PUBLIC', 'PRIVATE'],
        default: 'PUBLIC',
    },
    blockedUsers: [{ type: String }],
    features: {
        autoReply: { type: Boolean, default: false },
        typingDelay: { type: Boolean, default: false },
        groupWelcome: { type: Boolean, default: false },
        groupEvents: { type: Boolean, default: false },
        scheduledMessages: { type: Boolean, default: false },
        referralMessage: { type: Boolean, default: false },
        salute: { type: Boolean, default: false },
        antilink: { type: Boolean, default: false },
        onlineOnlyMode: { type: Boolean, default: false },
        paymentReminder: { type: Boolean, default: true },
        customCommands: { type: Boolean, default: false },
        menuCommand: { type: Boolean, default: true },
        blockCommand: { type: Boolean, default: false },
        unblockCommand: { type: Boolean, default: false },
        presence: { type: String, enum: ['online', 'typing', 'recording', 'off'], default: 'typing' },
        antiDelete: { type: Boolean, default: false },
        autobio: { type: Boolean, default: false },
        autoread: { type: Boolean, default: false },
        autoview: { type: Boolean, default: false },
        autolike: { type: Boolean, default: false },
    },
    customCommands: [
        {
            keyword: { type: String, required: true },
            response: { type: String, required: true },
        }
    ]
}, {
    timestamps: true
});
exports.default = (0, mongoose_1.model)('UserSettings', userSettingsSchema);
