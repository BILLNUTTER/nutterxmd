"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const User_js_1 = __importDefault(require("../../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../../models/UserSettings.js"));
const ALLOWED_PRESENCES = ['typing', 'recording', 'available'];
const PRESENCE_COOLDOWN_MS = 3000;
const lastPresence = {};
function isSocketOpen(sock) {
    return !!sock.user;
}
function isIndividualChat(jid) {
    return jid.endsWith('@s.whatsapp.net');
}
exports.feature = {
    name: 'presence',
    enabled: () => true,
    handle: async (sock, msg) => {
        if (!isSocketOpen(sock))
            return;
        if (!msg.key.remoteJid || msg.key.fromMe)
            return;
        const jid = msg.key.remoteJid;
        if (!isIndividualChat(jid))
            return;
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User_js_1.default.findOne({ phone: sessionPhone });
        if (!sessionUser) {
            console.log(`[presence] ❌ No session user found for ${sessionPhone}`);
            return;
        }
        const settings = await UserSettings_js_1.default.findOne({ userId: sessionUser._id });
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
            await sock.sendPresenceUpdate(presenceMode, jid);
            console.log(`[presence] ✅ Sent "${presenceMode}" to ${jid}`);
        }
        catch (error) {
            console.error(`[presence] ❌ Failed to send presence update to ${jid}:`, error);
        }
    },
};
