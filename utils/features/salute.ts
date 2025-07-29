import { WASocket, proto } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../../shared/types';
import User from '../../models/User';
import UserSettings from '../../models/UserSettings';

const WATERMARK = '\n\n_➤ nutterxmd_'; // faint style watermark

const TRIGGER_WORDS = [
  'vibes', 'mtaani', 'cringe', 'lol', 'motive',
  'broke', 'mapenzi', 'umekula', 'kumwaga', 'siwezi',
  'heartbreak', 'lonely', 'silent', 'ghosted'
];

const JOKES: string[] = [
  '😂 Mtu akikuambia "uko single juu uko selective", mwambie hata takataka huchaguliwa 😂',
  '🧠 Unajua kuna watu wanapenda sana kujua kuhusu maisha yako, si kwa msaada, ni kwa udaku 😅',
  '🤣 Dem akikuambia “I’m not ready for a relationship”, ujue amekuchorea kama ramani ya Kenya 📍',
  '🚶‍♂️ Kuna watu ni kama file ya zip, ukifungua hakuna kitu ndani 😭',
  '🕺 Ukiwa broke unakuwa philosopher – “I don’t believe in material things.” 😆',
  '😹 Usijali ukikosea kwa life, hata Google huuliza "Did you mean...?"',
  '💔 Ata unajua heartbreak si mbaya sana... shida ni vile inakufanya uanze kuwatch motivational videos 😭',
  '📵 Kuna dem alisema "simu yangu ilikuwa silent", for 4 days? Ni phone ama ilikuwa meditation retreat? 😆',
  '👀 Acha kudanganya watu eti “uko focused kwa goals” – hakuna goal, ni loneliness tu 😭',
  '🔥 Ukiona mtu anakutext “Upo?” midnight, ujue hakuna mpango wa maisha, ni vibes tu 😂',
  '😏 Ukiona mtu anasema “I’m healing” kwa bio, ujue aliwekwa na akawekwa kando 🔥',
  '🥲 Bro alibuy bouquet na dem akasema “Awww, thanks friend”... silent mode activated 😭',
  '😩 Kuna watu walizaliwa "seen" – ukiwatumia message, wanaitazama kama CV ya internship.',
];

function getRandomJoke(): string {
  const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
  return `${joke}${WATERMARK}`;
}

function getMessageText(msg: proto.IWebMessageInfo): string {
  const message = msg.message;
  if (!message) return '';

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.ephemeralMessage?.message?.conversation)
    return message.ephemeralMessage.message.conversation;
  if (message.ephemeralMessage?.message?.extendedTextMessage?.text)
    return message.ephemeralMessage.message.extendedTextMessage.text;

  return '';
}

export const feature: FeatureHandler = {
  name: 'salute',

  enabled: () => true,

  handle: async (sock: WASocket, msg: proto.IWebMessageInfo) => {
    const sessionPhone = sock.user?.id?.split('@')[0];
    const sessionUser = await User.findOne({ phone: sessionPhone });

    if (!sessionUser) return;

    const settings = await UserSettings.findOne({ userId: sessionUser._id });
    const isEnabled = settings?.features?.salute === true;

    if (!isEnabled) {
      console.log('[salute] ⛔ Genz jokes is disabled for this user');
      return;
    }

    const text = getMessageText(msg).toLowerCase();
    if (!text) return;

    const containsTrigger = TRIGGER_WORDS.some(word => text.includes(word));
    if (!containsTrigger) {
      console.log('[salute] ⏭️ No trigger word found.');
      return;
    }

    const remoteJid = msg.key.remoteJid;
    if (!remoteJid) return;

    try {
      const joke = getRandomJoke();
      await sock.sendMessage(remoteJid, { text: joke }, { quoted: msg });
      console.log(`[salute] ✅ Sent joke to ${remoteJid}`);
    } catch (err) {
      console.error(`[salute] ❌ Failed to send joke to ${remoteJid}:`, err);
    }
  },
};
