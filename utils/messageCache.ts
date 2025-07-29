import { proto } from '@whiskeysockets/baileys';

// In-memory cache for full messages (anti-delete), using: remoteJid_messageId
const messageCache = new Map<string, proto.IWebMessageInfo>();

// Activity tracker for groups (sender + timestamp)
const groupActivityCache: Record<string, { sender: string; timestamp: number }[]> = {};
const MAX_ACTIVITY_ENTRIES = 100;

/**
 * Save a full message (used for anti-delete recovery)
 */
export const saveMessage = (msg: proto.IWebMessageInfo): void => {
  const remoteJid = msg.key?.remoteJid;
  const messageId = msg.key?.id;

  if (!remoteJid || !messageId) return;

  const key = `${remoteJid}_${messageId}`;
  messageCache.set(key, msg);
};

/**
 * Save activity info (used for tagactive/taginactive)
 */
export const saveActiveMessage = (
  remoteJid: string,
  sender: string,
  timestamp: number
): void => {
  if (!remoteJid.endsWith('@g.us')) return;

  if (!groupActivityCache[remoteJid]) {
    groupActivityCache[remoteJid] = [];
  }

  groupActivityCache[remoteJid].push({ sender, timestamp });

  // Limit memory
  if (groupActivityCache[remoteJid].length > MAX_ACTIVITY_ENTRIES) {
    groupActivityCache[remoteJid] = groupActivityCache[remoteJid].slice(-MAX_ACTIVITY_ENTRIES);
  }
};

/**
 * Retrieve a cached message (anti-delete)
 */
export const getCachedMessage = (
  remoteJid: string,
  id: string
): proto.IWebMessageInfo | undefined => {
  const key = `${remoteJid}_${id}`;
  return messageCache.get(key);
};

/**
 * Get recent activity in a group (used by tagactive/taginactive)
 */
export const getRecentMessages = (
  groupJid: string
): { sender: string; timestamp: number }[] => {
  return groupActivityCache[groupJid] || [];
};
