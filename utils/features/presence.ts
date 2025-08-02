import { WASocket, proto } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../../shared/types.js';
import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';

const ALLOWED_PRESENCES = ['typing', 'recording', 'available'];
const PRESENCE_COOLDOWN_MS = 3000;
const lastPresence: Record<string, number> = {};

function isSocketOpen(sock: WASocket): boolean {
  return !!sock.user;
}

function isIndividualChat(jid: string): boolean {
  return jid.endsWith('@s.whatsapp.net');
}

export const feature: FeatureHandler = {
  name: 'presence',
  enabled: () => true,

  handle: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
    if (!isSocketOpen(sock)) return;
    if (!msg.key.remoteJid || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!isIndividualChat(jid)) return;

    const sessionPhone = sock.user?.id?.split('@')[0];
    const sessionUser = await User.findOne({ phone: sessionPhone });

    if (!sessionUser) {
      console.log(`[presence] ❌ No session user found for ${sessionPhone}`);
      return;
    }

    const settings = await UserSettings.findOne({ userId: sessionUser._id });
    const mode = settings?.features?.presence;

    if (!mode) {
      console.log(`[presence] ⚠️ No presence mode set for user ${sessionPhone}`);
      return;
    }

    // Fix mode alias: treat "online" as "available"
    const presenceMode = mode === 'online' ? 'available' : mode;
    if (!ALLOWED_PRESENCES.includes(presenceMode)) {
      console.log(`[presence] ❌ Invalid presence mode "${mode}" for ${sessionPhone}`);
      return;
    }

    const now = Date.now();
    if (lastPresence[jid] && now - lastPresence[jid] < PRESENCE_COOLDOWN_MS) {
      return;
    }
    lastPresence[jid] = now;

    try {
      await sock.sendPresenceUpdate(presenceMode as 'available' | 'composing' | 'recording', jid);
      console.log(`[presence] ✅ Sent "${presenceMode}" to ${jid}`);
    } catch (error) {
      console.error(`[presence] ❌ Failed to send presence update to ${jid}:`, error);
    }
  },
};
