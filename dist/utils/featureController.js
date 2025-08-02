"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePrefix = exports.updateUserSetting = exports.getUserSettings = void 0;
const UserSettings_1 = __importDefault(require("../models/UserSettings"));
// ===============================================
// USER FEATURE FLAGS (Stored in MongoDB)
// ===============================================
const getUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const settings = await UserSettings_1.default.findOne({ userId });
        return res.status(200).json(settings || {});
    }
    catch (err) {
        console.error('❌ Failed to fetch user settings:', err);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
};
exports.getUserSettings = getUserSettings;
const updateUserSetting = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { key, value } = req.body;
        if (typeof key !== 'string') {
            return res.status(400).json({ error: 'Invalid key' });
        }
        const settings = await UserSettings_1.default.findOneAndUpdate({ userId }, { $set: { [key]: value } }, { new: true, upsert: true });
        res.status(200).json({
            message: `✅ ${key} updated successfully`,
            settings,
        });
    }
    catch (err) {
        console.error('❌ Failed to update user setting:', err);
        res.status(500).json({ error: 'Failed to update user setting' });
    }
};
exports.updateUserSetting = updateUserSetting;
// ===============================================
// BOT PREFIX UPDATE
// ===============================================
const updatePrefix = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { prefix } = req.body;
        if (!prefix || typeof prefix !== 'string') {
            return res.status(400).json({ error: 'Invalid or missing prefix.' });
        }
        const updated = await UserSettings_1.default.findOneAndUpdate({ userId }, { prefix }, { new: true, upsert: true });
        return res.status(200).json({
            message: 'Prefix updated successfully',
            data: updated.prefix,
        });
    }
    catch (err) {
        console.error('❌ Failed to update prefix:', err);
        return res.status(500).json({ error: 'Failed to update prefix' });
    }
};
exports.updatePrefix = updatePrefix;
