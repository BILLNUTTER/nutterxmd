import { getSessionUserSettings } from '../utils/getSessionUserSettings.js';
import { extractCommandText } from '../utils/prefixGuard.js';
// Import all command modules
import { command as ping } from './commands/ping.js';
import { command as say } from './commands/say.js';
import { command as menu } from './commands/menu.js';
import { command as kick } from './commands/kick.js';
import { command as block } from './commands/block.js';
import { command as demote } from './commands/demote.js';
import { command as promote } from './commands/promote.js';
import { command as owner } from './commands/owner.js';
import { command as dp } from './commands/dp.js';
import { command as test } from './commands/test.js';
import { command as mute } from './commands/mute.js';
import { command as open } from './commands/open.js';
// Initialize command map
const commands = new Map();
const commandList = [
    ping, say, menu, kick, block, demote,
    promote, owner, dp, mute, open, test,
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
export const handleCommand = async (sock, msg) => {
    if (!msg?.message || !msg.key.remoteJid)
        return;
    const text = msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';
    const body = text.trim();
    // 🧠 Get session prefix and settings
    const sessionData = await getSessionUserSettings(sock);
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
    const cmdName = extractCommandText(body, maybePrefix);
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
