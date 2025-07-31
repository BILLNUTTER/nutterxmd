"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSettings = getUserSettings;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const settingsPath = path_1.default.join(__dirname, '../data/user_settings.json');
async function getUserSettings(userId) {
    try {
        const file = await promises_1.default.readFile(settingsPath, 'utf-8');
        const allSettings = JSON.parse(file);
        return allSettings[userId] || { features: {} };
    }
    catch (err) {
        console.error('Error loading settings:', err);
        return { features: {} };
    }
}
