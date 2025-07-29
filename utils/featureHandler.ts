import { WASocket, proto } from '@whiskeysockets/baileys';
import { FeatureHandler } from '../shared/types';
import { feature as autoreply } from './features/autoreply';
import { feature as antidelete } from './features/antidelete';
import { feature as groupEvents } from './features/groupEvents';
import { feature as presence } from './features/presence';
import { feature as autobio } from './features/autobio';
import { feature as antilink } from './features/antilink';
import { feature as salute } from './features/salute';
import { feature as autoread } from './features/autoread';
import { feature as autoview } from './features/autoview';

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
