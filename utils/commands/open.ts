import { WASocket, proto } from '@whiskeysockets/baileys';
import { BotCommand } from '../../shared/types.js';
import { getSessionUserSettings } from '../getSessionUserSettings.js';

const watermark = '| nutterxmd';

export const command: BotCommand = {
  name: 'open',
  description: '🔓 Opens the group (all members can send messages)',

  execute: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
    const jid = msg.key.remoteJid!;
    const senderJid = msg.key.participant || msg.key.remoteJid!;
    const isGroup = jid.endsWith('@g.us');

    if (!isGroup) {
      await sock.sendMessage(jid, {
        text: `❌ This command only works in *groups*.\n\n${watermark}`
      });
      return;
    }

    const session = await getSessionUserSettings(sock);
    if (!session || !session.settings) return;

    const groupMeta = await sock.groupMetadata(jid);
    const isSenderAdmin = groupMeta.participants.some(
      p => p.id === senderJid && p.admin !== undefined
    );

    if (!isSenderAdmin) {
      await sock.sendMessage(jid, {
        text: `❌ Only *group admins* can use this command.\n\n${watermark}`
      });
      return;
    }

    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      await sock.sendMessage(jid, {
        text: `🔓 Group has been *opened*. All members can now send messages.\n\n${watermark}`
      });
    } catch (err) {
      console.error('❌ Failed to open group:', err);
      await sock.sendMessage(jid, {
        text: `❌ Failed to open the group due to an error.\n\n${watermark}`
      });
    }
  }
};
