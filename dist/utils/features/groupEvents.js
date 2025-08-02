"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feature = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_js_1 = __importDefault(require("../../models/User.js"));
const UserSettings_js_1 = __importDefault(require("../../models/UserSettings.js"));
const WATERMARK = '_➤ nutterxmd_';
dotenv_1.default.config();
const getProfilePictureUrl = async (sock, jid) => {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        return url ?? null;
    }
    catch {
        return null;
    }
};
exports.feature = {
    name: 'groupEvents',
    enabled: () => true,
    register: (sock) => {
        sock.ev.on('group-participants.update', async (update) => {
            const { id: groupJid, participants, action } = update;
            try {
                const sessionPhone = sock.user?.id?.split('@')[0];
                const sessionUser = await User_js_1.default.findOne({ phone: sessionPhone });
                if (!sessionUser) {
                    console.log(`[groupEvents] ❌ No session user for ${sessionPhone}`);
                    return;
                }
                const settings = await UserSettings_js_1.default.findOne({ userId: sessionUser._id });
                if (!settings?.features?.groupWelcome) {
                    console.log(`[groupEvents] ⛔ groupWelcome is disabled for ${sessionPhone}`);
                    return;
                }
                const metadata = await sock.groupMetadata(groupJid);
                const groupName = metadata.subject;
                for (const participant of participants) {
                    const userJid = participant;
                    const username = userJid.split('@')[0];
                    const mentions = [userJid];
                    let messageText = null;
                    let imageJid = userJid;
                    if (['add', 'join'].includes(action)) {
                        messageText = `🌸 *Welcome @${username}!* 🌸\nYou're now part of *${groupName}* 🎉\nEnjoy your time here! 💐\n\n${WATERMARK}`;
                    }
                    else if (['remove', 'leave'].includes(action)) {
                        messageText = `💐 *@${username}* just left *${groupName}*.\nFarewell! 🕊️\n\n${WATERMARK}`;
                        imageJid = groupJid;
                    }
                    if (!messageText)
                        return;
                    const ppUrl = await getProfilePictureUrl(sock, imageJid);
                    if (ppUrl) {
                        const response = await axios_1.default.get(ppUrl, { responseType: 'arraybuffer' });
                        const imageBuffer = Buffer.from(response.data, 'binary');
                        await sock.sendMessage(groupJid, {
                            image: imageBuffer,
                            caption: messageText,
                            mentions,
                        });
                    }
                    else {
                        await sock.sendMessage(groupJid, {
                            text: messageText,
                            mentions,
                        });
                    }
                    console.log(`[groupEvents] ✅ ${action === 'add' ? 'Welcomed' : 'Farewelled'} @${username} in ${groupName} (${groupJid})`);
                }
            }
            catch (err) {
                console.error('❌ Error handling group participant update:', err);
            }
        });
    },
};
