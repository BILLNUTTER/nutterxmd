import { WASocket, proto } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../shared/types.js';
import { feature as autoreply } from './features/autoreply.js';
import { feature as antidelete } from './features/antidelete.js';
import { feature as groupEvents } from './features/groupEvents.js';
import { feature as presence } from './features/presence.js';
import { feature as autobio } from './features/autobio.js';
import { feature as antilink } from './features/antilink.js';
import { feature as salute } from './features/salute.js';
import { feature as autoread } from './features/autoread.js';
import { feature as autoview } from './features/autoview.js';

const features: FeatureHandler[] = [
  autoreply,
  antidelete,
  groupEvents,
  presence,
  autobio,
  antilink,
  salute,
  autoread,
  autoview,
  // Add more features here
];

// ✅ Always register all feature hooks – each feature will decide internally if it should act
export const registerFeatureHooks = (sock: WASocket) => {
  for (const feature of features) {
    if (feature.register) {
      try {
        feature.register(sock);
      } catch (err) {
        console.error(`❌ Feature "${feature.name}" register() failed:\n\n | nutterxmd`, err);
      }
    }
  }
};

// ✅ Only handle message-based features that are enabled
export const handleFeatures = async (
  sock: WASocket,
  msg: proto.IWebMessageInfo
): Promise<void> => {
  for (const feature of features) {
    if (!feature.enabled || !feature.handle) continue;

    try {
      await feature.handle(sock, msg);
    } catch (err) {
      console.error(`❌ Feature "${feature.name}" handle() error:\n\n | nutterxmd`, err);
    }
  }
};
