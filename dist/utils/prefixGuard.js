"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPrefix = getUserPrefix;
exports.extractCommandText = extractCommandText;
const User_js_1 = __importDefault(require("../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../models/UserSettings.js"));
/**
 * Strictly fetch the registered prefix for the current session.
 * If no user/settings found, returns `null` to enforce NO fallback.
 */
async function getUserPrefix(sock) {
    const sessionPhone = sock.user?.id?.split('@')[0];
    if (!sessionPhone)
        return null;
    const sessionUser = await User_js_1.default.findOne({ phone: sessionPhone });
    if (!sessionUser)
        return null;
    const settings = await UserSettings_js_1.default.findOne({ userId: sessionUser._id });
    return settings?.prefix ?? null; // 👈 no fallback
}
/**
 * Extracts the command name from the message if prefix matches.
 * Returns `null` if prefix doesn't match.
 */
function extractCommandText(text, prefix) {
    if (!text.startsWith(prefix))
        return null;
    const command = text.slice(prefix.length).trim().split(' ')[0].toLowerCase();
    return command || null;
}
