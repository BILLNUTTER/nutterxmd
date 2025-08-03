import { WASocket, proto, downloadMediaMessage } from '@whiskeysockets/baileys';
import { BotCommand } from '../../shared/types.js';
import { getSessionUserSettings } from '../../utils/getSessionUserSettings.js';

const watermark = '\n\n_➤ nutterxmd_';

export const command: BotCommand = {
    name: 'vv',
    description: 'View once retriever — extract image/video/audio from a view-once message reply.',

    execute: async (sock: WASocket, msg: proto.IWebMessageInfo): Promise<void> => {
        const jid = msg.key.remoteJid!;
        const sessionData = await getSessionUserSettings(sock);

        if (!sessionData?.user || !sessionData?.settings) {
            await sock.sendMessage(jid, {
                text: `❌ Session not registered. Link your bot via dashboard first.${watermark}`,
            });
            return;
        }

        const { prefix } = sessionData.settings;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text.startsWith(prefix)) return;

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;

        if (!quoted || !contextInfo?.stanzaId || !contextInfo?.participant) {
            await sock.sendMessage(jid, {
                text: `⚠️ Reply to a *view once* image/video/voice message with \`${prefix}vv\` to extract it.${watermark}`,
            });
            return;
        }

        try {
            const viewOnceContent = quoted.viewOnceMessageV2?.message;
            if (!viewOnceContent) throw new Error('Quoted message is not a view-once message.');

            let mediaType: 'imageMessage' | 'videoMessage' | 'audioMessage' | null = null;
            if (viewOnceContent.imageMessage) mediaType = 'imageMessage';
            else if (viewOnceContent.videoMessage) mediaType = 'videoMessage';
            else if (viewOnceContent.audioMessage) mediaType = 'audioMessage';

            if (!mediaType) {
                await sock.sendMessage(jid, {
                    text: `❌ Unsupported or non-view-once media. Please reply to a view-once image, video, or audio message.${watermark}`,
                });
                return;
            }

            const mediaMsg = viewOnceContent[mediaType];
            if (!mediaMsg) throw new Error('Media not found in view-once message.');

            // 👇 Patch: Add `reuploadRequest` for Baileys type compatibility
            const customSock = {
                ...sock,
                reuploadRequest: async (): Promise<proto.IWebMessageInfo> => {
                    // Return a dummy valid proto.IWebMessageInfo object
                    return {
                        key: {
                            remoteJid: '',
                            fromMe: false,
                            id: '',
                        },
                    };
                },
            };
            const mediaBuffer = (await downloadMediaMessage(
                {
                    key: {
                        remoteJid: jid,
                        fromMe: false,
                        id: contextInfo.stanzaId!,
                        participant: contextInfo.participant!,
                    },
                    message: { [mediaType]: mediaMsg },
                } as proto.IWebMessageInfo,
                'buffer',
                {},
                customSock
            )) as Buffer;

            if (mediaType === 'imageMessage') {
                await sock.sendMessage(jid, {
                    image: mediaBuffer,
                    caption: `📸 Retrieved view-once image.${watermark}`,
                });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(jid, {
                    video: mediaBuffer,
                    caption: `🎥 Retrieved view-once video.${watermark}`,
                });
            } else if (mediaType === 'audioMessage') {
                await sock.sendMessage(jid, {
                    audio: mediaBuffer,
                    mimetype: 'audio/mp4',
                });
            }
        } catch (err) {
            console.error('vv error:', err);
            await sock.sendMessage(jid, {
                text: `❌ Failed to extract view-once message.${watermark}`,
            });
        }
    },
};
