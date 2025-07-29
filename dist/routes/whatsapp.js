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
const express_1 = require("express");
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const whatsapp_js_1 = require("../utils/whatsapp.js");
const session_js_1 = require("../utils/session.js");
const Session_js_1 = __importDefault(require("../models/Session.js"));
const User_js_1 = __importDefault(require("../models/User.js"));
const auth_js_1 = require("../middleware/auth.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
router.post('/generate-qr', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        console.log(`📩 Incoming request to generate QR for user: ${userId}`);
        const sessionResult = await (0, whatsapp_js_1.createWhatsAppSession)(userId);
        const { sessionId, qr, isLinked, linkedNumber } = sessionResult;
        if (!qr && !sessionId) {
            console.error(`❌ Failed to generate QR for user: ${userId}`);
            return res.status(500).json({ message: 'Failed to generate QR code. Please try again.' });
        }
        let session = await Session_js_1.default.findOne({ userId });
        if (!session)
            session = new Session_js_1.default({ userId });
        session.sessionId = sessionId || session.sessionId;
        session.whatsappNumber = linkedNumber ?? session.whatsappNumber ?? '';
        session.isLinked = isLinked ?? false;
        session.isActive = isLinked ?? false;
        session.isPaid = false;
        await session.save();
        if (sessionId)
            await User_js_1.default.findByIdAndUpdate(userId, { sessionId });
        if (isLinked && linkedNumber && sessionId) {
            try {
                await (0, whatsapp_js_1.sendWhatsAppMessage)(sessionId, `${linkedNumber}@s.whatsapp.net`, `✅ *NutterXMD linked successfully!*\n\n🔑 *Your Session ID:* \n${sessionId}`);
                console.log(`📤 Sent session ID to ${linkedNumber}`);
            }
            catch (err) {
                console.error('❌ Failed to send session ID via WhatsApp:', err);
            }
        }
        res.json({
            sessionId,
            qr: qr || '',
            message: isLinked
                ? '✅ WhatsApp linked successfully. Session ID is ready.'
                : '📲 Scan the QR code and follow instructions on WhatsApp.',
        });
    }
    catch (error) {
        console.error('🚨 QR generation error:', error);
        res.status(500).json({ message: 'Failed to generate QR code' });
    }
});
router.post('/generate-pair-code', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        let { whatsappNumber } = req.body;
        if (!whatsappNumber?.trim()) {
            console.error('❌ No WhatsApp number provided.');
            return res.status(400).json({ message: 'WhatsApp number is required' });
        }
        whatsappNumber = whatsappNumber.replace(/\D/g, '');
        if (whatsappNumber.length !== 12 || !whatsappNumber.startsWith('2547')) {
            console.error(`❌ Invalid number format: ${whatsappNumber}`);
            return res.status(400).json({
                message: 'Please enter a valid 12-digit number starting with 2547 (e.g., 254712345678)',
            });
        }
        const sessionsRoot = path_1.default.resolve('./sessions');
        if (!fs_1.default.existsSync(sessionsRoot))
            fs_1.default.mkdirSync(sessionsRoot, { recursive: true });
        const tempSessionId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempSessionPath = path_1.default.join(sessionsRoot, tempSessionId);
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(tempSessionPath);
        const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
        const sock = (0, baileys_1.default)({
            auth: state,
            version,
            printQRInTerminal: false,
            syncFullHistory: false,
            browser: ['NutterXMD', 'Chrome', '1.0.0'],
        });
        sock.ev.on('creds.update', saveCreds);
        let responded = false;
        let finalSessionId = null;
        let hasRequestedCode = false;
        const respondOnce = (data) => {
            if (!responded) {
                responded = true;
                res.json(data);
            }
        };
        const timeout = setTimeout(() => {
            if (!responded) {
                console.warn('⏱️ Timeout: Pairing code not received.');
                respondOnce({ message: '❌ Timeout. Pairing code not received in time. Please try again.' });
                if (fs_1.default.existsSync(tempSessionPath)) {
                    fs_1.default.rmSync(tempSessionPath, { recursive: true, force: true });
                }
            }
        }, 30000);
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            console.log('🔄 connection.update:', { connection });
            if (!hasRequestedCode && sock.authState?.creds?.registered === false && connection === 'connecting') {
                hasRequestedCode = true;
                try {
                    const jid = `${whatsappNumber}@s.whatsapp.net`;
                    console.log(`📞 Requesting pairing code for: ${jid}`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const code = await sock.requestPairingCode(jid);
                    console.log(`📲 Pairing code for user ${userId}: ${code}`);
                    respondOnce({
                        pairingCode: code,
                        message: '📲 Enter this code in WhatsApp > Linked Devices > Link with Phone Number',
                    });
                }
                catch (err) {
                    console.error(`❌ Failed to request pairing code for ${whatsappNumber}:`, err);
                    respondOnce({
                        message: '❌ Error generating pairing code. Make sure the number is valid and not already linked.',
                    });
                }
            }
            if (connection === 'open') {
                clearTimeout(timeout);
                const linkedNumber = sock.user?.id?.split(':')[0];
                finalSessionId = (0, session_js_1.generateSecureSessionId)();
                const finalSessionPath = path_1.default.join(sessionsRoot, finalSessionId);
                fs_1.default.renameSync(tempSessionPath, finalSessionPath);
                await Session_js_1.default.updateOne({ userId }, {
                    userId,
                    whatsappNumber: linkedNumber,
                    sessionId: finalSessionId,
                    isLinked: true,
                    isActive: true,
                    isPaid: false,
                }, { upsert: true });
                await User_js_1.default.findByIdAndUpdate(userId, { sessionId: finalSessionId });
                try {
                    await (0, whatsapp_js_1.sendWhatsAppMessage)(finalSessionId, `${linkedNumber}@s.whatsapp.net`, `✅ *NutterXMD linked successfully!*\n\n🔑 *Your Session ID:* \n${finalSessionId}\n\n_➤ nutterxmd_`);
                    console.log(`✅ WhatsApp successfully linked: ${linkedNumber}`);
                }
                catch (err) {
                    console.error('❌ Failed to send confirmation message:', err);
                }
            }
            if (connection === 'close') {
                clearTimeout(timeout);
                if (!finalSessionId && fs_1.default.existsSync(tempSessionPath)) {
                    fs_1.default.rmSync(tempSessionPath, { recursive: true, force: true });
                }
                if (!responded) {
                    const reason = lastDisconnect?.error?.message || 'Unknown reason';
                    console.error('❌ Connection closed:', reason);
                    respondOnce({ message: `❌ Connection closed: ${reason}` });
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Pair code generation error:', error);
        res.status(500).json({ message: '❌ Internal server error during pair code generation.' });
        try {
            const sessionsRoot = path_1.default.resolve('./sessions');
            const tempDirs = fs_1.default.readdirSync(sessionsRoot).filter(dir => dir.startsWith('temp-'));
            for (const dir of tempDirs) {
                const fullPath = path_1.default.join(sessionsRoot, dir);
                fs_1.default.rmSync(fullPath, { recursive: true, force: true });
            }
        }
        catch (cleanupErr) {
            console.error('🧹 Cleanup error during temp session deletion:', cleanupErr);
        }
    }
});
router.post('/send-session', auth_js_1.auth, async (req, res) => {
    try {
        const userId = req.userId;
        const session = await Session_js_1.default.findOne({ userId });
        if (!session)
            return res.status(404).json({ message: 'Session not found' });
        if (!session.isLinked)
            return res.status(400).json({ message: 'WhatsApp not linked yet' });
        if (!session.sessionId || session.sessionId.trim() === '' || session.sessionId.length < 1000) {
            const newSessionId = (0, session_js_1.generateSecureSessionId)();
            session.sessionId = newSessionId;
            session.isActive = true;
            await session.save();
            await User_js_1.default.findByIdAndUpdate(userId, { sessionId: newSessionId });
        }
        if (session.whatsappNumber && session.sessionId) {
            try {
                await (0, whatsapp_js_1.sendWhatsAppMessage)(session.sessionId, `${session.whatsappNumber}@s.whatsapp.net`, `🔔 Your Session ID is ready:\n\n🔑 ${session.sessionId}\n\n📨 Please send payment to M-Pesa 0758891491 and paste the confirmation message in the payment section.`);
                console.log(`📤 Sent session ID to user: ${session.whatsappNumber}`);
            }
            catch (err) {
                console.error('❌ Failed to send session to WhatsApp number:', err);
            }
        }
        res.json({
            message: 'Session ID sent to developer successfully.',
            sessionId: session.sessionId,
            instructions: '📨 Please send payment to M-Pesa number 0758891491 and paste the confirmation message in the payment section.',
        });
    }
    catch (error) {
        console.error('❌ Error sending session:', error);
        res.status(500).json({ message: 'Failed to send session ID' });
    }
});
exports.default = router;
