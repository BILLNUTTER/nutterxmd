import { WASocket } from '@whiskeysockets/baileys';

/**
 * Safe profile picture fetcher
 */
export const getProfilePictureUrl = async (
  sock: WASocket,
  jid: string
): Promise<string | null> => {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    return url ?? null; // convert undefined to null
  } catch {
    return null;
  }
};
