"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentMessages = exports.getCachedMessage = exports.saveActiveMessage = exports.saveMessage = void 0;
// In-memory cache for full messages (anti-delete), using: remoteJid_messageId
const messageCache = new Map();
// Activity tracker for groups (sender + timestamp)
const groupActivityCache = {};
const MAX_ACTIVITY_ENTRIES = 100;
/**
 * Save a full message (used for anti-delete recovery)
 */
const saveMessage = (msg) => {
    const remoteJid = msg.key?.remoteJid;
    const messageId = msg.key?.id;
    if (!remoteJid || !messageId)
        return;
    const key = `${remoteJid}_${messageId}`;
    messageCache.set(key, msg);
};
exports.saveMessage = saveMessage;
/**
 * Save activity info (used for tagactive/taginactive)
 */
const saveActiveMessage = (remoteJid, sender, timestamp) => {
    if (!remoteJid.endsWith('@g.us'))
        return;
    if (!groupActivityCache[remoteJid]) {
        groupActivityCache[remoteJid] = [];
    }
    groupActivityCache[remoteJid].push({ sender, timestamp });
    // Limit memory
    if (groupActivityCache[remoteJid].length > MAX_ACTIVITY_ENTRIES) {
        groupActivityCache[remoteJid] = groupActivityCache[remoteJid].slice(-MAX_ACTIVITY_ENTRIES);
    }
};
exports.saveActiveMessage = saveActiveMessage;
/**
 * Retrieve a cached message (anti-delete)
 */
const getCachedMessage = (remoteJid, id) => {
    const key = `${remoteJid}_${id}`;
    return messageCache.get(key);
};
exports.getCachedMessage = getCachedMessage;
/**
 * Get recent activity in a group (used by tagactive/taginactive)
 */
const getRecentMessages = (groupJid) => {
    return groupActivityCache[groupJid] || [];
};
exports.getRecentMessages = getRecentMessages;
