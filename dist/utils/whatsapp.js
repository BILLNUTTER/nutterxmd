"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeSessions = exports.disconnectSession = exports.getActiveSession = exports.sendWhatsAppMessage = exports.createWhatsAppSession = exports.generateSecureSessionId = void 0;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const qrcode_1 = __importDefault(require("qrcode"));
const Session_js_1 = __importDefault(require("../models/Session.js"));
const User_js_1 = __importDefault(require("../models/User.js"));
const messageHandler_1 = require("./messageHandler");
const messageCache_1 = require("../utils/messageCache");
const groupEvents_1 = require("./features/groupEvents");
const antidelete_1 = require("./features/antidelete");
const autobio_1 = require("./features/autobio");
const antilink_1 = require("./features/antilink");
const autoreply_1 = require("./features/autoreply");
const presence_1 = require("./features/presence");
const salute_1 = require("./features/salute");
const autoread_1 = require("./features/autoread");
const autoview_1 = require("./features/autoview");
const autolike_1 = require("./features/autolike");
const isFreshCreds = (sessionFolderPath) => {
    const credsFilePath = path.join(sessionFolderPath, 'creds.json');
    return fs.existsSync(credsFilePath);
};
// ✅ Load admin phone from .env
const adminPhone = process.env.ADMIN_PHONE || '';
const activeSessions = new Map();
exports.activeSessions = activeSessions;
const generateSecureSessionId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 1000 + Math.floor(Math.random() * 100);
    let sessionString = '';
    for (let i = 0; i < length; i++) {
        sessionString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `nutter-xmd-${sessionString}`;
};
exports.generateSecureSessionId = generateSecureSessionId;
const generateBase64QRCode = async (qrText) => {
    try {
        return await qrcode_1.default.toDataURL(qrText);
    }
    catch (err) {
        console.error('❌ Failed to generate QR Code image:', err);
        return '';
    }
};
const createWhatsAppSession = async (userId, userPhoneNumber, forceNew = false) => {
    if (!userId)
        throw new Error('userId is required');
    const sessionFolder = path.join('./sessions', userId);
    const credsPath = path.join(sessionFolder, 'creds.json');
    let secureSessionId = '';
    // 🧹 Remove orphaned DB session
    const existingSession = await Session_js_1.default.findOne({ userId, isLinked: true, isActive: true });
    if (existingSession && !fs.existsSync(credsPath)) {
        console.warn('🧹 Orphaned session found — cleaning DB record...');
        await Session_js_1.default.findOneAndUpdate({ userId }, { sessionId: '', isLinked: false, isActive: false });
        await User_js_1.default.findByIdAndUpdate(userId, { sessionId: '' });
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
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionFolder);
        const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
        const sock = (0, baileys_1.default)({
            version,
            printQRInTerminal: false,
            auth: state,
            connectTimeoutMs: 60_000,
            browser: ['NutterXMD', 'chrome', '1.0.0'],
        });
        if (groupEvents_1.feature.enabled && typeof groupEvents_1.feature.register === 'function') {
            groupEvents_1.feature.register(sock);
        }
        if (autobio_1.feature.enabled && typeof autobio_1.feature.register === 'function') {
            autobio_1.feature.register(sock);
        }
        // ✅ PATCH: Auto-fill missing phone
        setTimeout(async () => {
            try {
                const linkedNumber = sock.user?.id?.split('@')[0];
                if (!linkedNumber)
                    return;
                const user = await User_js_1.default.findById(userId);
                if (!user) {
                    console.warn(`❌ No user found in DB with ID: ${userId}`);
                    return;
                }
                if (!user.phone) {
                    console.log(`📲 Setting missing phone for user ${userId}: ${linkedNumber}`);
                    await User_js_1.default.findByIdAndUpdate(userId, { phone: linkedNumber });
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
                if (presence_1.feature.enabled && typeof presence_1.feature.handle === 'function') {
                    await presence_1.feature.handle(sock, msg);
                }
                if (salute_1.feature.enabled && typeof salute_1.feature.onReady === 'function') {
                    salute_1.feature.onReady(sock);
                }
                if (salute_1.feature.enabled && typeof salute_1.feature.handle === 'function') {
                    await salute_1.feature.handle(sock, msg);
                }
                (0, messageCache_1.saveMessage)(msg);
                await (0, messageHandler_1.handleCommand)(sock, msg);
                // ✅ Anti-delete
                if (antidelete_1.feature.enabled && typeof antidelete_1.feature.handle === 'function') {
                    await antidelete_1.feature.handle(sock, msg);
                }
                // ✅ Auto-reply
                if (autoreply_1.feature.enabled && typeof autoreply_1.feature.handle === 'function') {
                    await autoreply_1.feature.handle(sock, msg);
                }
                // ✅ Auto-view Statuses
                if (autoview_1.feature.enabled && typeof autoview_1.feature.handle === 'function') {
                    await autoview_1.feature.handle(sock, msg);
                }
                // ✅ Anti-link
                if (antilink_1.feature.enabled && typeof antilink_1.feature.handle === 'function') {
                    await antilink_1.feature.handle(sock, msg);
                }
                if (autoread_1.feature.enabled && typeof autoread_1.feature.handle === 'function') {
                    await autoread_1.feature.handle(sock, msg);
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
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionFolder);
    const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
    return new Promise((resolve) => {
        const sock = (0, baileys_1.default)({
            version,
            printQRInTerminal: false,
            auth: state,
            browser: ['NutterXMD', 'chrome', '1.0.0']
        });
        if (groupEvents_1.feature.enabled && typeof groupEvents_1.feature.register === 'function') {
            groupEvents_1.feature.register(sock);
        }
        if (autobio_1.feature.enabled && typeof autobio_1.feature.register === 'function') {
            autobio_1.feature.register(sock);
        }
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg?.message)
                return;
            try {
                //auto-read
                if (autoread_1.feature.enabled && typeof autoread_1.feature.handle === 'function') {
                    await autoread_1.feature.handle(sock, msg);
                }
                // ✅ Auto-view Statuses
                if (autoview_1.feature.enabled && typeof autoview_1.feature.handle === 'function') {
                    await autoview_1.feature.handle(sock, msg);
                }
                //autolike status
                if (autolike_1.feature.enabled && typeof autolike_1.feature.handle === 'function') {
                    await autolike_1.feature.handle(sock, msg);
                }
                // ✅ Simulate presence
                if (presence_1.feature.enabled && typeof presence_1.feature.handle === 'function') {
                    await presence_1.feature.handle(sock, msg);
                }
                if (salute_1.feature.enabled && typeof salute_1.feature.onReady === 'function') {
                    salute_1.feature.onReady(sock);
                }
                (0, messageCache_1.saveMessage)(msg);
                await (0, messageHandler_1.handleCommand)(sock, msg);
                // ✅ Anti-delete
                if (antidelete_1.feature.enabled && typeof antidelete_1.feature.handle === 'function') {
                    await antidelete_1.feature.handle(sock, msg);
                }
                // ✅ Auto-reply
                if (autoreply_1.feature.enabled && typeof autoreply_1.feature.handle === 'function') {
                    await autoreply_1.feature.handle(sock, msg);
                }
                // ✅ Anti-link
                if (antilink_1.feature.enabled && typeof antilink_1.feature.handle === 'function') {
                    await antilink_1.feature.handle(sock, msg);
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
                secureSessionId = (0, exports.generateSecureSessionId)();
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
                await Session_js_1.default.findOneAndUpdate({ userId }, {
                    sessionId: secureSessionId,
                    sessionPath,
                    sessionData: creds,
                    isLinked: true,
                    isActive: true,
                    whatsappNumber: linkedNumber
                }, { upsert: true });
                const user = await User_js_1.default.findById(userId);
                if (!user) {
                    console.log(`🆕 Creating new user entry with phone: ${linkedNumber}`);
                    await User_js_1.default.create({
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
                    await User_js_1.default.findByIdAndUpdate(userId, updateData);
                }
                if (linkedNumber) {
                    // ✅ Ensure user exists before saving session info
                    const existingUser = await User_js_1.default.findById(userId);
                    if (!existingUser) {
                        console.error(`❌ User with ID ${userId} not found – cannot save phone`);
                    }
                    else {
                        await User_js_1.default.findByIdAndUpdate(userId, {
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
                await Session_js_1.default.findOneAndUpdate({ userId }, { sessionId: '', isActive: false, isLinked: false });
                await User_js_1.default.findByIdAndUpdate(userId, { sessionId: '' });
                activeSessions.delete(userId);
                // 🔁 Only try to reconnect if not a manual logout
                if (!isConflict && !isLoggedOut) {
                    console.log('🔁 Attempting reconnect in 2s...');
                    setTimeout(() => (0, exports.createWhatsAppSession)(userId, userPhoneNumber), 2000);
                }
            }
        });
        sock.ev.on('creds.update', saveCreds);
    });
};
exports.createWhatsAppSession = createWhatsAppSession;
// 📤 Send message from active session
const sendWhatsAppMessage = async (sessionId, to, message) => {
    const session = activeSessions.get(sessionId);
    if (!session || !session.isConnected || !session.socket) {
        throw new Error('❌ WhatsApp session not connected');
    }
    await session.socket.sendMessage(to, { text: message });
};
exports.sendWhatsAppMessage = sendWhatsAppMessage;
// 🔎 Get session in memory
const getActiveSession = (sessionId) => {
    return activeSessions.get(sessionId);
};
exports.getActiveSession = getActiveSession;
// ❌ Disconnect session
const disconnectSession = (sessionId) => {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.socket?.ws?.close?.();
        activeSessions.delete(sessionId);
    }
};
exports.disconnectSession = disconnectSession;
