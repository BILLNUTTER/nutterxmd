"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSettings = exports.updatePrefix = exports.updateFeatureFlag = exports.getFeatureFlags = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const UserSettings_1 = __importDefault(require("../models/UserSettings"));
const envPath = path_1.default.resolve(__dirname, '../../.env');
// ✅ Parse the .env into key-value pairs
const parseEnv = (envContent) => {
    return Object.fromEntries(envContent
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => {
        const [key, val] = line.split('=');
        return [key.trim(), val.trim()];
    }));
};
// ===============================================
// GLOBAL FEATURE FLAGS (from .env)
// ===============================================
const getFeatureFlags = async (req, res) => {
    try {
        const envContent = fs_1.default.readFileSync(envPath, 'utf8');
        const flags = parseEnv(envContent);
        res.json(flags);
    }
    catch (error) {
        console.error('Failed to read .env:', error);
        res.status(500).json({ error: 'Unable to load feature flags' });
    }
};
exports.getFeatureFlags = getFeatureFlags;
const updateFeatureFlag = async (req, res) => {
    const { key, value } = req.body;
    if (typeof key !== 'string' || typeof value !== 'string') {
        return res.status(400).json({ error: 'Invalid key or value' });
    }
    try {
        let envContent = fs_1.default.readFileSync(envPath, 'utf8');
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            // Update existing key
            envContent = envContent.replace(regex, `${key}=${value}`);
        }
        else {
            // Append new key
            if (!envContent.endsWith('\n'))
                envContent += '\n';
            envContent += `${key}=${value}\n`;
        }
        fs_1.default.writeFileSync(envPath, envContent);
        res.json({ message: `✅ ${key} set to ${value}` });
    }
    catch (err) {
        console.error('Failed to update .env:', err);
        res.status(500).json({ error: 'Failed to update .env file' });
    }
};
exports.updateFeatureFlag = updateFeatureFlag;
// ===============================================
// USER SETTINGS (Prefix, etc.)
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
const getUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const settings = await UserSettings_1.default.findOne({ userId });
        res.status(200).json(settings || {});
    }
    catch (err) {
        console.error('❌ Failed to fetch user settings:', err);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
};
exports.getUserSettings = getUserSettings;
