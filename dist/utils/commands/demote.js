"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.command = void 0;
const getSessionUserSettings_js_1 = require("../../utils/getSessionUserSettings.js");
const constants_1 = require("../../shared/constants");
const watermark = '\n\n_➤ nutterxmd_';
exports.command = {
    name: 'demote',
    description: '⬇️ Demote mentioned user(s) from group admin',
    execute: async (sock, msg) => {
        const groupId = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const sessionData = await (0, getSessionUserSettings_js_1.getSessionUserSettings)(sock);
        if (!sessionData?.user || !sessionData?.settings) {
            await sock.sendMessage(groupId, {
                text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
            });
            return;
        }
        const userPrefix = sessionData.settings.prefix;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text.startsWith(userPrefix))
            return;
        const isGroup = groupId.endsWith('@g.us');
        const isOwner = senderJid.includes(constants_1.ADMIN_PHONE);
        if (!isGroup) {
            await sock.sendMessage(groupId, {
                text: `❌ This command only works in *groups*.${watermark}`,
            });
            return;
        }
        if (!mentioned.length) {
            await sock.sendMessage(groupId, {
                text: `❌ Please *tag* the user(s) you want to demote.\n\n💡 Example: *${userPrefix}demote @user*${watermark}`,
                mentions: [senderJid],
            });
            return;
        }
        const metadata = await sock.groupMetadata(groupId);
        const botId = sock.user?.id;
        const isBotAdmin = metadata.participants.some(p => p.id === botId && p.admin !== undefined);
        const isSenderAdmin = metadata.participants.some(p => p.id === senderJid && p.admin !== undefined);
        if (!isBotAdmin) {
            await sock.sendMessage(groupId, {
                text: `⚠️ I need to be a *group admin* to manage roles.${watermark}`,
            });
            return;
        }
        if (!isSenderAdmin && !isOwner) {
            await sock.sendMessage(groupId, {
                text: `🚫 You must be a *group admin* to use this command.${watermark}`,
            });
            return;
        }
        for (const user of mentioned) {
            const participant = metadata.participants.find(p => p.id === user);
            const isUserAdmin = participant?.admin !== undefined;
            if (!isUserAdmin) {
                await sock.sendMessage(groupId, {
                    text: `ℹ️ @${user.split('@')[0]} is *not an admin*.${watermark}`,
                    mentions: [user],
                });
                continue;
            }
            try {
                await sock.groupParticipantsUpdate(groupId, [user], 'demote');
                await sock.sendMessage(groupId, {
                    text: `⬇️ @${user.split('@')[0]} has been *demoted* from admin.${watermark}`,
                    mentions: [user],
                });
            }
            catch (err) {
                console.error(`❌ Failed to demote ${user}`, err);
                await sock.sendMessage(groupId, {
                    text: `❌ Failed to demote @${user.split('@')[0]}.${watermark}`,
                    mentions: [user],
                });
            }
        }
    },
};
