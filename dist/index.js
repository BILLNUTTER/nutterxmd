"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ✅ Load .env file early
const envPath = path_1.default.resolve(__dirname, '../.env');
if (fs_1.default.existsSync(envPath)) {
    console.log(`📦 Loading environment variables from: ${envPath}`);
    dotenv_1.default.config({ path: envPath });
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
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ✅ Import routes
console.log('🔌 Importing route modules...');
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const whatsapp_js_1 = __importDefault(require("./routes/whatsapp.js"));
const payment_js_1 = __importDefault(require("./routes/payment.js"));
const dashboard_js_1 = __importDefault(require("./routes/dashboard.js"));
const admin_js_1 = __importDefault(require("./routes/admin.js"));
const features_1 = __importDefault(require("./routes/features"));
const whatsapp_js_2 = require("./utils/whatsapp.js");
const User_js_1 = __importDefault(require("./models/User.js"));
const Session_js_1 = __importDefault(require("./models/Session.js"));
// ✅ Connect MongoDB
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/nutterxmd';
        await mongoose_1.default.connect(uri);
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
    const sessions = await Session_js_1.default.find({ isLinked: true, isActive: true });
    let restoredCount = 0;
    for (const session of sessions) {
        const credsPath = path_1.default.join('./sessions', session.userId, 'creds.json');
        if (!fs_1.default.existsSync(credsPath)) {
            console.warn(`🗑️ Skipping session for user ${session.userId} — missing creds.json`);
            continue;
        }
        const stats = fs_1.default.statSync(credsPath);
        const ageMs = Date.now() - stats.mtimeMs;
        if (ageMs > RESTORE_MAX_AGE_MS) {
            console.warn(`⏱️ Skipping session for user ${session.userId} — stale (${Math.round(ageMs / 60000)} min old)`);
            continue;
        }
        try {
            console.log(`🔄 Restoring session for user ${session.userId}...`);
            await (0, whatsapp_js_2.createWhatsAppSession)(session.userId);
            restoredCount++;
        }
        catch (err) {
            console.warn(`⚠️ Failed to restore session for ${session.userId}:`, err);
        }
    }
    if (restoredCount === 0) {
        console.warn('🆕 No live sessions restored. Creating a new one with QR for a user...');
        const anyUser = await User_js_1.default.findOne({}); // You can filter or prioritize here
        if (anyUser) {
            try {
                const { qr } = await (0, whatsapp_js_2.createWhatsAppSession)(anyUser._id.toString(), undefined, true);
                if (qr) {
                    const qrPath = path_1.default.join('./', `qr-${anyUser._id}.png`);
                    fs_1.default.writeFileSync(qrPath, Buffer.from(qr.split(',')[1], 'base64'));
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
    app.use('/api/auth', auth_js_1.default);
    app.use('/api/whatsapp', whatsapp_js_1.default);
    app.use('/api/payment', payment_js_1.default);
    app.use('/api/dashboard', dashboard_js_1.default);
    app.use('/api/admin', admin_js_1.default);
    app.use('/api/features', features_1.default);
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
