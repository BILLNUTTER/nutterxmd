import { WASocket } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../../shared/types';
import User from '../../models/User.js';
import UserSettings from '../../models/UserSettings.js';

const WATERMARK = '\n\n_➤ nutterxmd_';

const JOKES_AND_QUOTES = [
  '😂 Mtu akikuambia "uko single juu uko selective", mwambie hata takataka huchaguliwi',
  '🧠 Kuna watu wanapenda sana kujua kuhusu maisha yako, si kwa msaada, ni kwa udaku 😅',
  '🤣 Dem akikuambia “I’m not ready for a relationship”, ujue amekuchorea kama ramani ya Kenya',
  '🚶‍♂️ Kuna watu ni kama file ya zip, ukifungua hakuna kitu ndani 😭',
  '💻 Coding my dreams',
  '☕ Coffee + Code = Life',
  '🌈 Living the moment',
  '🔍 Stay curious',
  '🎩 Creating magic in silence',
  '⚙️ Driven by innovation',
];

let currentQuote = getRandomJokeOrQuote();

function getRandomJokeOrQuote(): string {
  return JOKES_AND_QUOTES[Math.floor(Math.random() * JOKES_AND_QUOTES.length)];
}

function getCurrentTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export const feature: FeatureHandler = {
  name: 'autobio',

  enabled: () => true, // always loaded, conditionally runs in register

  register: async (sock: WASocket) => {
    const sessionPhone = sock.user?.id?.split('@')[0];
    const sessionUser = await User.findOne({ phone: sessionPhone });
    if (!sessionUser) {
      console.log(`[autobio] ❌ No session user found for ${sessionPhone}`);
      return;
    }

    const settings = await UserSettings.findOne({ userId: sessionUser._id });
    if (!settings?.features?.autobio) {
      console.log(`[autobio] 🚫 Feature disabled for ${sessionPhone}`);
      return;
    }

    const updateBio = async () => {
      const time = getCurrentTime();
      const newBio = `${currentQuote} | ${time}${WATERMARK}`;
      try {
        await sock.updateProfileStatus(newBio);
      } catch (err) {
        console.error('❌ Failed to update bio:', err);
      }
    };

    // Rotate quote every 30 minutes and log it
    setInterval(() => {
      currentQuote = getRandomJokeOrQuote();
      console.log(`🌀 New bio quote: ${currentQuote}`);
    }, 30 * 60 * 1000);

    // Update time every 15 seconds silently
    setInterval(updateBio, 15 * 1000);

    // Immediate first update
    await updateBio();
  },

  handle: async () => { },
};
