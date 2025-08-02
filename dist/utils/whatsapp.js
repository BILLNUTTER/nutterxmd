import makeWASocket, { useMultiFileAuthState as multiFileAuth, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { handleCommand } from './messageHandler.js';
import { saveMessage } from '../utils/messageCache.js';
import { feature as groupEvents } from './features/groupEvents.js';
import { feature as antiDelete } from './features/antidelete.js';
import { feature as autoBio } from './features/autobio.js';
import { feature as antiLink } from './features/antilink.js';
import { feature as autoReply } from './features/autoreply.js';
import { feature as presence } from './features/presence.js';
import { feature as salute } from './features/salute.js';
import { feature as autoread } from './features/autoread.js';
import { feature as autoview } from './features/autoview.js';
import { feature as autolike } from './features/autolike.js';
const isFreshCreds = (sessionFolderPath) => {
    const credsFilePath = path.join(sessionFolderPath, 'creds.json');
    return fs.existsSync(credsFilePath);
};
// ✅ Load admin phone from .env
const adminPhone = process.env.ADMIN_PHONE || '';
const activeSessions = new Map();
export const generateSecureSessionId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 1000 + Math.floor(Math.random() * 100);
    let sessionString = '';
    for (let i = 0; i < length; i++) {
        sessionString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `nutter-xmd-${sessionString}`;
};
const generateBase64QRCode = async (qrText) => {
    try {
        return await QRCode.toDataURL(qrText);
    }
    catch (err) {
        console.error('❌ Failed to generate QR Code image:', err);
        return '';
    }
};
export const createWhatsAppSession = async (userId, userPhoneNumber, forceNew = false) => {
    if (!userId)
        throw new Error('userId is required');
    const sessionFolder = path.join('./sessions', userId);
    const credsPath = path.join(sessionFolder, 'creds.json');
    let secureSessionId = '';
    // 🧹 Remove orphaned DB session
    const existingSession = await Session.findOne({ userId, isLinked: true, isActive: true });
    if (existingSession && !fs.existsSync(credsPath)) {
        console.warn('🧹 Orphaned session found — cleaning DB record...');
        await Session.findOneAndUpdate({ userId }, { sessionId: '', isLinked: false, isActive: false });
        await User.findByIdAndUpdate(userId, { sessionId: '' });
    }
    // 🔌 Cleanup any existing in-memory socket
    if (activeSessions.has(userId)) {
        try {
            const prev = activeSessions.get(userId);
            // Only end socket if function exists
            if (prev?.socket?.end && typeof prev.socket.end === 'function') {
                prev.socket.end(new Error('Replaced by new session'));
            }
            activeSessions.delete(userId);
            console.log(`🔁 Terminated existing socket for user ${userId}`);
        }
        catch (err) {
            console.warn('⚠️ Failed to close existing socket:', err);
        }
    }
    // ✅ Check if we can restore an active session
    const credsExist = isFreshCreds(sessionFolder);
    const sessionIsLive = existingSession?.isActive &&
        existingSession?.isLinked &&
        credsExist;
    // ✅ Restore existing session if valid and not forcing new
    if (!forceNew && sessionIsLive) {
        const { state, saveCreds } = await multiFileAuth(sessionFolder);
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            connectTimeoutMs: 60000,
            browser: ['NutterXMD', 'chrome', '1.0.0'],
        });
        if (groupEvents.enabled && typeof groupEvents.register === 'function') {
            groupEvents.register(sock);
        }
        if (autoBio.enabled && typeof autoBio.register === 'function') {
            autoBio.register(sock);
        }
        // ✅ PATCH: Auto-fill missing phone
        setTimeout(async () => {
            try {
                const linkedNumber = sock.user?.id?.split('@')[0];
                if (!linkedNumber)
                    return;
                const user = await User.findById(userId);
                if (!user) {
                    console.warn(`❌ No user found in DB with ID: ${userId}`);
                    return;
                }
                if (!user.phone) {
                    console.log(`📲 Setting missing phone for user ${userId}: ${linkedNumber}`);
                    await User.findByIdAndUpdate(userId, { phone: linkedNumber });
                }
            }
            catch (err) {
                console.error(`❌ Failed to update phone for user ${userId}:`, err);
            }
        }, 1500);
        // 🧠 Message & command listeners
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg?.message)
                return;
            try {
                if (presence.enabled && typeof presence.handle === 'function') {
                    await presence.handle(sock, msg);
                }
                if (salute.enabled && typeof salute.onReady === 'function') {
                    salute.onReady(sock);
                }
                if (salute.enabled && typeof salute.handle === 'function') {
                    await salute.handle(sock, msg);
                }
                saveMessage(msg);
                await handleCommand(sock, msg);
                // ✅ Anti-delete
                if (antiDelete.enabled && typeof antiDelete.handle === 'function') {
                    await antiDelete.handle(sock, msg);
                }
                // ✅ Auto-reply
                if (autoReply.enabled && typeof autoReply.handle === 'function') {
                    await autoReply.handle(sock, msg);
                }
                // ✅ Auto-view Statuses
                if (autoview.enabled && typeof autoview.handle === 'function') {
                    await autoview.handle(sock, msg);
                }
                // ✅ Anti-link
                if (antiLink.enabled && typeof antiLink.handle === 'function') {
                    await antiLink.handle(sock, msg);
                }
                if (autoread.enabled && typeof autoread.handle === 'function') {
                    await autoread.handle(sock, msg);
                }
            }
            catch (err) {
                console.error('⚠️ Error in messages.upsert:', err);
            }
        });
        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            console.log('📡 Connection status:', connection);
            if (connection === 'close') {
                console.warn('❌ Socket disconnected:', lastDisconnect?.error);
            }
        });
        activeSessions.set(userId, {
            socket: sock,
            sessionId: existingSession.sessionId ?? '',
            isConnected: true
        });
        console.log('✅ Restored session for:', userId);
        return {
            sessionId: existingSession.sessionId ?? '',
            isLinked: true,
            sessionData: state.creds
        };
    }
    // 🌱 Create new session if not restoring
    if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
    }
    const { state, saveCreds } = await multiFileAuth(sessionFolder);
    const { version } = await fetchLatestBaileysVersion();
    return new Promise((resolve) => {
        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            browser: ['NutterXMD', 'chrome', '1.0.0']
        });
        if (groupEvents.enabled && typeof groupEvents.register === 'function') {
            groupEvents.register(sock);
        }
        if (autoBio.enabled && typeof autoBio.register === 'function') {
            autoBio.register(sock);
        }
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg?.message)
                return;
            try {
                //auto-read
                if (autoread.enabled && typeof autoread.handle === 'function') {
                    await autoread.handle(sock, msg);
                }
                // ✅ Auto-view Statuses
                if (autoview.enabled && typeof autoview.handle === 'function') {
                    await autoview.handle(sock, msg);
                }
                //autolike status
                if (autolike.enabled && typeof autolike.handle === 'function') {
                    await autolike.handle(sock, msg);
                }
                // ✅ Simulate presence
                if (presence.enabled && typeof presence.handle === 'function') {
                    await presence.handle(sock, msg);
                }
                if (salute.enabled && typeof salute.onReady === 'function') {
                    salute.onReady(sock);
                }
                saveMessage(msg);
                await handleCommand(sock, msg);
                // ✅ Anti-delete
                if (antiDelete.enabled && typeof antiDelete.handle === 'function') {
                    await antiDelete.handle(sock, msg);
                }
                // ✅ Auto-reply
                if (autoReply.enabled && typeof autoReply.handle === 'function') {
                    await autoReply.handle(sock, msg);
                }
                // ✅ Anti-link
                if (antiLink.enabled && typeof antiLink.handle === 'function') {
                    await antiLink.handle(sock, msg);
                }
            }
            catch (err) {
                console.error('⚠️ Error handling command:', err);
            }
        });
        let resolved = false;
        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            if (qr && !resolved) {
                const base64Qr = await generateBase64QRCode(qr);
                resolved = true;
                return resolve({ qr: base64Qr });
            }
            if (connection === 'open' && !secureSessionId) {
                secureSessionId = generateSecureSessionId();
                await saveCreds();
                const creds = await state.creds;
                const linkedNumber = sock.user?.id?.split('@')[0] || '';
                const sessionPath = path.join('./sessions', secureSessionId);
                // ✅ Save to activeSessions (by userId now)
                activeSessions.set(userId, {
                    socket: sock,
                    sessionId: secureSessionId,
                    isConnected: true
                });
                await Session.findOneAndUpdate({ userId }, {
                    sessionId: secureSessionId,
                    sessionPath,
                    sessionData: creds,
                    isLinked: true,
                    isActive: true,
                    whatsappNumber: linkedNumber
                }, { upsert: true });
                const user = await User.findById(userId);
                if (!user) {
                    console.log(`🆕 Creating new user entry with phone: ${linkedNumber}`);
                    await User.create({
                        _id: userId,
                        phone: linkedNumber,
                        sessionId: secureSessionId,
                        status: 'active', // optional default
                        settings: {
                            autoReply: true,
                            groupEvents: true,
                            paymentReminders: false,
                            commandPrefix: '.',
                            botMode: 'public'
                        }
                    });
                }
                else {
                    const updateData = { sessionId: secureSessionId };
                    if (!user.phone)
                        updateData.phone = linkedNumber;
                    await User.findByIdAndUpdate(userId, updateData);
                }
                if (linkedNumber) {
                    // ✅ Ensure user exists before saving session info
                    const existingUser = await User.findById(userId);
                    if (!existingUser) {
                        console.error(`❌ User with ID ${userId} not found – cannot save phone`);
                    }
                    else {
                        await User.findByIdAndUpdate(userId, {
                            sessionId: secureSessionId,
                            phone: linkedNumber
                        });
                        console.log(`✅ Updated user ${existingUser.username} with phone ${linkedNumber}`);
                    }
                    setTimeout(async () => {
                        try {
                            if (connection !== 'open')
                                return;
                            await sock.sendMessage(`${linkedNumber}@s.whatsapp.net`, {
                                text: `✅ *NutterXMD linked successfully!*\nYou're now connected.`
                            });
                            await sock.sendMessage(`${linkedNumber}@s.whatsapp.net`, {
                                text: `🔑 *Your Session ID:*\n${secureSessionId}`
                            });
                            if (adminPhone) {
                                await sock.sendMessage(`${adminPhone}@s.whatsapp.net`, {
                                    text: `📦 *New WhatsApp Session Linked!*\n👤 *User ID:* ${userId}\n📱 *Number:* ${linkedNumber}\n🆔 *Session ID:* ${secureSessionId}`
                                });
                            }
                        }
                        catch (err) {
                            console.error('❌ Failed to send welcome/admin message:', err);
                        }
                    }, 1000);
                }
                resolved = true;
                return resolve({
                    sessionId: secureSessionId,
                    isLinked: true,
                    sessionData: creds
                });
            }
            if (connection === 'close') {
                const errorCode = lastDisconnect?.error?.output?.payload?.error;
                const isConflict = errorCode === 'conflict';
                const isLoggedOut = errorCode === 'loggedOut';
                if (isConflict) {
                    console.warn('❌ Session conflict: replaced by another login. Cleaning up...');
                }
                else if (isLoggedOut) {
                    console.warn('🚪 Manual logout detected by user. Cleaning up session.');
                }
                else {
                    console.warn(`⚠️ Unexpected disconnect (reason: ${errorCode}).`);
                }
                // 🧹 Cleanup DB session and memory
                await Session.findOneAndUpdate({ userId }, { sessionId: '', isActive: false, isLinked: false });
                await User.findByIdAndUpdate(userId, { sessionId: '' });
                activeSessions.delete(userId);
                // 🔁 Only try to reconnect if not a manual logout
                if (!isConflict && !isLoggedOut) {
                    console.log('🔁 Attempting reconnect in 2s...');
                    setTimeout(() => createWhatsAppSession(userId, userPhoneNumber), 2000);
                }
            }
        });
        sock.ev.on('creds.update', saveCreds);
    });
};
// 📤 Send message from active session
export const sendWhatsAppMessage = async (sessionId, to, message) => {
    const session = activeSessions.get(sessionId);
    if (!session || !session.isConnected || !session.socket) {
        throw new Error('❌ WhatsApp session not connected');
    }
    await session.socket.sendMessage(to, { text: message });
};
// 🔎 Get session in memory
export const getActiveSession = (sessionId) => {
    return activeSessions.get(sessionId);
};
// ❌ Disconnect session
export const disconnectSession = (sessionId) => {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.socket?.ws?.close?.();
        activeSessions.delete(sessionId);
    }
};
export { activeSessions };
