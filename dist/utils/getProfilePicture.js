"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfilePictureUrl = void 0;
/**
 * Safe profile picture fetcher
 */
const getProfilePictureUrl = async (sock, jid) => {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        return url ?? null; // convert undefined to null
    }
    catch {
        return null;
    }
};
exports.getProfilePictureUrl = getProfilePictureUrl;
