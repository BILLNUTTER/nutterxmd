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
            // Funny Gen Z welcome lines
            const welcomes = [
              `🎉 Oop—look who showed up! *@${username}* just rolled into *${groupName}* like they own the place. Grab a seat, we saved you one 😂\n\n${WATERMARK}`,
              `🌟 *@${username}* has entered *${groupName}*! Someone cue the dramatic entrance music 🎶\n\n${WATERMARK}`,
              `🛬 *@${username}* landed safely in *${groupName}*. Fasten your seatbelt, it's gonna be a bumpy ride 💀\n\n${WATERMARK}`,
              `👋 *@${username}* just spawned in *${groupName}*. Hope you brought snacks, we’re here for a while 🍿\n\n${WATERMARK}`
            ];
            messageText = welcomes[Math.floor(Math.random() * welcomes.length)];
          } else if (['remove', 'leave'].includes(action)) {
            // Funny Gen Z farewell lines
            const farewells = [
              `🚪 *@${username}* just rage quit *${groupName}*... probably to start a podcast 💀`,
              `👋 *@${username}* dipped faster than my WiFi during a Netflix binge 📉`,
              `💨 *@${username}* left *${groupName}* so fast I think they broke the sound barrier 💥`,
              `🕳️ *@${username}* disappeared like free pizza at an office party 🍕`,
              `🎤 *@${username}* just left the chat... mic drop moment 🎤`,
              `🏃 *@${username}* left like they saw their ex join the group 💔`,
              `🌚 *@${username}* ghosted us without a single “brb” 👻`,
              `🛫 *@${username}* took a one-way flight out of *${groupName}*. No return ticket booked ✈️`
            ];

            const farewellText = farewells[Math.floor(Math.random() * farewells.length)];
            const remainingMembers = metadata.participants.length - 1;

            messageText = `${farewellText}\n😂 LMAO bye!\n👥 Members left: *${remainingMembers}*\n\n${WATERMARK}`;
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
