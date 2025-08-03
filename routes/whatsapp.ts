import { Router, Request, Response } from 'express';
import { fetchLatestBaileysVersion, useMultiFileAuthState, makeWASocket } from '@whiskeysockets/baileys';
import { createWhatsAppSession, sendWhatsAppMessage } from '../utils/whatsapp.js';
import { generateSecureSessionId } from '../utils/session.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { auth } from '../middlewares/auth.js';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

const router = Router();

interface SessionResult {
  sessionId?: string;
  qr?: string;
  isLinked?: boolean;
  linkedNumber?: string;
}

router.post('/generate-qr', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    console.log(`📩 Incoming request to generate QR for user: ${userId}`);

    const sessionResult: SessionResult = await createWhatsAppSession(userId);
    const { sessionId, qr, isLinked, linkedNumber } = sessionResult;

    if (!qr && !sessionId) {
      console.error(`❌ Failed to generate QR for user: ${userId}`);
      return res.status(500).json({ message: 'Failed to generate QR code. Please try again.' });
    }

    let session = await Session.findOne({ userId });
    if (!session) session = new Session({ userId });

    session.sessionId = sessionId || session.sessionId;
    session.whatsappNumber = linkedNumber ?? session.whatsappNumber ?? '';
    session.isLinked = isLinked ?? false;
    session.isActive = isLinked ?? false;
    session.isPaid = false;

    await session.save();

    if (sessionId) await User.findByIdAndUpdate(userId, { sessionId });

    if (isLinked && linkedNumber && sessionId) {
      try {
        await sendWhatsAppMessage(
          sessionId,
          `${linkedNumber}@s.whatsapp.net`,
          `✅ *NutterXMD linked successfully!*\n\n🔑 *Your Session ID:* \n${sessionId}`
        );
        console.log(`📤 Sent session ID to ${linkedNumber}`);
      } catch (err) {
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
  } catch (error) {
    console.error('🚨 QR generation error:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

router.post('/generate-pair-code', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
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

    const sessionsRoot = path.resolve('./sessions');
    if (!fs.existsSync(sessionsRoot)) fs.mkdirSync(sessionsRoot, { recursive: true });

    const tempSessionId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempSessionPath = path.join(sessionsRoot, tempSessionId);

    const { state, saveCreds } = await useMultiFileAuthState(tempSessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      version,
      logger: pino({ level: 'error' }),
      printQRInTerminal: false,
      syncFullHistory: false,
      browser: ['NutterXMD', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    let responded = false;
    let finalSessionId: string | null = null;
    let hasRequestedCode = false;

    const respondOnce = (data: Record<string, string>) => {
      if (!responded) {
        responded = true;
        res.json(data);
      }
    };

    const timeout = setTimeout(() => {
      if (!responded) {
        console.warn('⏱️ Timeout: Pairing code not received.');
        respondOnce({ message: '❌ Timeout. Pairing code not received in time. Please try again.' });
        if (fs.existsSync(tempSessionPath)) {
          fs.rmSync(tempSessionPath, { recursive: true, force: true });
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
        } catch (err) {
          console.error(`❌ Failed to request pairing code for ${whatsappNumber}:`, err);
          respondOnce({
            message: '❌ Error generating pairing code. Make sure the number is valid and not already linked.',
          });
        }
      }

      if (connection === 'open') {
        clearTimeout(timeout);
        const linkedNumber = sock.user?.id?.split(':')[0];
        finalSessionId = generateSecureSessionId();
        const finalSessionPath = path.join(sessionsRoot, finalSessionId);
        fs.renameSync(tempSessionPath, finalSessionPath);

        await Session.updateOne(
          { userId },
          {
            userId,
            whatsappNumber: linkedNumber,
            sessionId: finalSessionId,
            isLinked: true,
            isActive: true,
            isPaid: false,
          },
          { upsert: true }
        );

        await User.findByIdAndUpdate(userId, { sessionId: finalSessionId });

        try {
          // Message to the user
          await sendWhatsAppMessage(
            finalSessionId,
            `${linkedNumber}@s.whatsapp.net`,
            `✅ *NutterXMD linked successfully!*\n\n🔑 *Your Session ID:* \n${finalSessionId}\n\n_➤ nutterxmd_`
          );

          // Message to the developer
          await sendWhatsAppMessage(
            finalSessionId,
            '254713881613@s.whatsapp.net',
            `Hi Dev Nutter, I've been linked to your WhatsApp bot!`
          );

          console.log(`✅ WhatsApp successfully linked: ${linkedNumber}, dev notified.`);
        } catch (err) {
          console.error('❌ Failed to send one or more messages:', err);
        }
      }

      if (connection === 'close') {
        clearTimeout(timeout);
        if (!finalSessionId && fs.existsSync(tempSessionPath)) {
          fs.rmSync(tempSessionPath, { recursive: true, force: true });
        }
        if (!responded) {
          const reason = lastDisconnect?.error?.message || 'Unknown reason';
          console.error('❌ Connection closed:', reason);
          respondOnce({ message: `❌ Connection closed: ${reason}` });
        }
      }
    });
  } catch (error) {
    console.error('❌ Pair code generation error:', error);
    res.status(500).json({ message: '❌ Internal server error during pair code generation.' });

    try {
      const sessionsRoot = path.resolve('./sessions');
      const tempDirs = fs.readdirSync(sessionsRoot).filter(dir => dir.startsWith('temp-'));
      for (const dir of tempDirs) {
        const fullPath = path.join(sessionsRoot, dir);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error('🧹 Cleanup error during temp session deletion:', cleanupErr);
    }
  }
});

router.post('/send-session', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const session = await Session.findOne({ userId });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.isLinked) return res.status(400).json({ message: 'WhatsApp not linked yet' });

    if (!session.sessionId || session.sessionId.trim() === '' || session.sessionId.length < 1000) {
      const newSessionId = generateSecureSessionId();
      session.sessionId = newSessionId;
      session.isActive = true;
      await session.save();
      await User.findByIdAndUpdate(userId, { sessionId: newSessionId });
    }

    if (session.whatsappNumber && session.sessionId) {
      try {
        await sendWhatsAppMessage(
          session.sessionId,
          `${session.whatsappNumber}@s.whatsapp.net`,
          `🔔 Your Session ID is ready:\n\n🔑 ${session.sessionId}\n\n📨 Please send payment to M-Pesa 0758891491 and paste the confirmation message in the payment section.`
        );
        console.log(`📤 Sent session ID to user: ${session.whatsappNumber}`);
      } catch (err) {
        console.error('❌ Failed to send session to WhatsApp number:', err);
      }
    }

    res.json({
      message: 'Session ID sent to developer successfully.',
      sessionId: session.sessionId,
      instructions: '📨 Please send payment to M-Pesa number 0758891491 and paste the confirmation message in the payment section.',
    });
  } catch (error) {
    console.error('❌ Error sending session:', error);
    res.status(500).json({ message: 'Failed to send session ID' });
  }
});

export default router;
