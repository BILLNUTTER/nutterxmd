import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// ✅ Load .env file early
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    console.log(`📦 Loading environment variables from: ${envPath}`);
    dotenv.config({ path: envPath });
}
else {
    console.warn(`⚠️ .env file not found at: ${envPath}`);
}
// ✅ Validate essential env vars
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'MONGO_URI'];
REQUIRED_ENV_VARS.forEach((key) => {
    if (!process.env[key]) {
        console.warn(`⚠️ Missing required env: ${key}`);
    }
});
const PORT = process.env.PORT || 5000;
// ✅ Log ENV summary
console.log('🔍 Loaded ENV variables:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   ADMIN_KEY: ${process.env.ADMIN_KEY ? '[DEFINED]' : '[NOT DEFINED]'}`);
console.log(`   MONGO_URI: ${process.env.MONGO_URI ? '[DEFINED]' : '[NOT DEFINED]'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '[DEFINED]' : '[NOT DEFINED]'}`);
// ✅ Express app setup
const app = express();
app.use(cors());
app.use(express.json());
// ✅ Import routes
console.log('🔌 Importing route modules...');
import authRoutes from './routes/auth';
import whatsappRoutes from './routes/whatsapp';
import paymentRoutes from './routes/payment';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import featureRoutes from './routes/features';
import { createWhatsAppSession } from './utils/whatsapp.js';
import User from './models/User.js';
import Session from './models/Session.js';
// ✅ Connect MongoDB
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/nutterxmd';
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected');
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('❌ MongoDB connection error:', err.message);
        }
        else {
            console.error('❌ MongoDB connection error:', err);
        }
        process.exit(1);
    }
};
// ✅ Restore only fresh/live WhatsApp sessions
// ⏳ Restore active sessions or create new one if none found
const RESTORE_MAX_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours
const restoreActiveSessions = async () => {
    console.log('♻️ Checking for active WhatsApp sessions to restore...');
    const sessions = await Session.find({ isLinked: true, isActive: true });
    let restoredCount = 0;
    for (const session of sessions) {
        const credsPath = path.join('./sessions', session.userId, 'creds.json');
        if (!fs.existsSync(credsPath)) {
            console.warn(`🗑️ Skipping session for user ${session.userId} — missing creds.json`);
            continue;
        }
        const stats = fs.statSync(credsPath);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs > RESTORE_MAX_AGE_MS) {
            console.warn(`⏱️ Skipping session for user ${session.userId} — stale (${Math.round(ageMs / 60000)} min old)`);
            continue;
        }
        try {
            console.log(`🔄 Restoring session for user ${session.userId}...`);
            await createWhatsAppSession(session.userId);
            restoredCount++;
        }
        catch (err) {
            console.warn(`⚠️ Failed to restore session for ${session.userId}:`, err);
        }
    }
    if (restoredCount === 0) {
        console.warn('🆕 No live sessions restored. Creating a new one with QR for a user...');
        const anyUser = await User.findOne({}); // You can filter or prioritize here
        if (anyUser) {
            try {
                const { qr } = await createWhatsAppSession(anyUser._id.toString(), undefined, true);
                if (qr) {
                    const qrPath = path.join('./', `qr-${anyUser._id}.png`);
                    fs.writeFileSync(qrPath, Buffer.from(qr.split(',')[1], 'base64'));
                    console.log(`📲 QR code generated for user ${anyUser._id} at: ${qrPath}`);
                }
            }
            catch (err) {
                console.error('❌ Failed to create QR session for new user:', err);
            }
        }
        else {
            console.error('❌ No users found in DB to create a new session.');
        }
    }
    else {
        console.log(`✅ Restored ${restoredCount} active WhatsApp session(s).`);
    }
};
// ✅ Start server after DB & session restore
connectDB().then(() => {
    restoreActiveSessions();
    // ✅ Mount API routes
    console.log('🚏 Registering API routes...');
    app.use('/api/auth', authRoutes);
    app.use('/api/whatsapp', whatsappRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/features', featureRoutes);
    // ✅ Health check route
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    // ❌ Handle unknown routes
    app.use('*', (_req, res) => {
        res.status(404).json({ message: 'API route not found' });
    });
    // ✅ Start server
    app.listen(PORT, () => {
        console.log(`🚀 NutterXMD Backend running at http://localhost:${PORT}`);
    });
});
