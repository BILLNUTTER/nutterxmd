"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommand = void 0;
const getSessionUserSettings_js_1 = require("../utils/getSessionUserSettings.js");
const prefixGuard_js_1 = require("../utils/prefixGuard.js");
// Import all command modules
const ping_1 = require("./commands/ping");
const say_1 = require("./commands/say");
const menu_1 = require("./commands/menu");
const kick_1 = require("./commands/kick");
const block_1 = require("./commands/block");
const demote_1 = require("./commands/demote");
const promote_1 = require("./commands/promote");
const owner_1 = require("./commands/owner");
const dp_1 = require("./commands/dp");
const test_1 = require("./commands/test");
const mute_1 = require("./commands/mute");
const open_1 = require("./commands/open");
// Initialize command map
const commands = new Map();
const commandList = [
    ping_1.command, say_1.command, menu_1.command, kick_1.command, block_1.command, demote_1.command,
    promote_1.command, owner_1.command, dp_1.command, mute_1.command, open_1.command, test_1.command,
];
for (const cmd of commandList) {
    commands.set(cmd.name, cmd);
    // ✅ Support aliases
    if ('aliases' in cmd && Array.isArray(cmd.aliases)) {
        for (const alias of cmd.aliases) {
            commands.set(alias, cmd);
        }
    }
}
const handleCommand = async (sock, msg) => {
    if (!msg?.message || !msg.key.remoteJid)
        return;
    const text = msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';
    const body = text.trim();
    // 🧠 Get session prefix and settings
    const sessionData = await (0, getSessionUserSettings_js_1.getSessionUserSettings)(sock);
    if (!sessionData || !sessionData.settings)
        return;
    const { settings, user } = sessionData;
    // 🔐 Enforce PRIVATE mode
    const senderJid = msg.key.remoteJid;
    const isOwner = senderJid === `${user.phone}@s.whatsapp.net`;
    if (settings.mode === 'PRIVATE' && !isOwner)
        return;
    const maybePrefix = settings.prefix;
    if (!maybePrefix)
        return;
    // ❌ Skip if doesn't start with user-defined prefix
    if (!body.startsWith(maybePrefix))
        return;
    // ✅ Extract command name
    const cmdName = (0, prefixGuard_js_1.extractCommandText)(body, maybePrefix);
    if (!cmdName)
        return;
    const command = commands.get(cmdName);
    if (!command)
        return;
    try {
        await command.execute(sock, msg);
    }
    catch (err) {
        console.error(`❌ Error executing command "${cmdName}":`, err);
    }
};
exports.handleCommand = handleCommand;
