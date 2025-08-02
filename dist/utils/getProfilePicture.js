/**
 * Safe profile picture fetcher
 */
export const getProfilePictureUrl = async (sock, jid) => {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        return url ?? null; // convert undefined to null
    }
    catch {
        return null;
    }
};
