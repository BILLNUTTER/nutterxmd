import { WASocket, GroupMetadata } from '@whiskeysockets/baileys';
import axios from 'axios';
import { FeatureHandler } from '../../shared/types.js';
import dotenv from 'dotenv';
import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';


const WATERMARK = '_➤ nutterxmd_';

dotenv.config();

const getProfilePictureUrl = async (
  sock: WASocket,
  jid: string
): Promise<string | null> => {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    return url ?? null;
  } catch {
    return null;
  }
};

export const feature: FeatureHandler = {
  name: 'groupEvents',

  enabled: () => true,

  register: (sock: WASocket) => {
    sock.ev.on('group-participants.update', async (update) => {
      const { id: groupJid, participants, action } = update;

      try {
        const sessionPhone = sock.user?.id?.split('@')[0];
        const sessionUser = await User.findOne({ phone: sessionPhone });

        if (!sessionUser) {
          console.log(`[groupEvents] ❌ No session user for ${sessionPhone}`);
          return;
        }

        const settings = await UserSettings.findOne({ userId: sessionUser._id });

        if (!settings?.features?.groupWelcome) {
          console.log(`[groupEvents] ⛔ groupWelcome is disabled for ${sessionPhone}`);
          return;
        }

        const metadata: GroupMetadata = await sock.groupMetadata(groupJid);
        const groupName = metadata.subject;

        for (const participant of participants) {
          const userJid = participant;
          const username = userJid.split('@')[0];
          const mentions = [userJid];

          let messageText: string | null = null;
          let imageJid = userJid;

          if (['add', 'join'].includes(action)) {
            messageText = `🌸 *Welcome @${username}!* 🌸\nYou're now part of *${groupName}* 🎉\nEnjoy your time here! 💐\n\n${WATERMARK}`;
          } else if (['remove', 'leave'].includes(action)) {
            messageText = `💐 *@${username}* just left *${groupName}*.\nFarewell! 🕊️\n\n${WATERMARK}`;
            imageJid = groupJid;
          }

          if (!messageText) return;

          const ppUrl = await getProfilePictureUrl(sock, imageJid);

          if (ppUrl) {
            const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');

            await sock.sendMessage(groupJid, {
              image: imageBuffer,
              caption: messageText,
              mentions,
            });
          } else {
            await sock.sendMessage(groupJid, {
              text: messageText,
              mentions,
            });
          }

          console.log(
            `[groupEvents] ✅ ${action === 'add' ? 'Welcomed' : 'Farewelled'} @${username} in ${groupName} (${groupJid})`
          );
        }
      } catch (err) {
        console.error('❌ Error handling group participant update:', err);
      }
    });
  },
};
