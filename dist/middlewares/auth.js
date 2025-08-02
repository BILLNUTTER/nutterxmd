import jwt from 'jsonwebtoken';
// 🔐 JWT Auth Middleware
export const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET is not set in environment variables.');
            return res.status(500).json({ message: 'Server configuration error: missing JWT secret' });
        }
        // ✅ Safely cast decoded JWT
        const decoded = jwt.verify(token, jwtSecret);
        req.userId = decoded.userId;
        next();
    }
    catch (err) {
        console.error('❌ Invalid token:', err);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};
// 🛡️ Admin Key Middleware
export const adminAuth = (req, res, next) => {
    const incomingKey = req.headers['admin-key'];
    const expectedKey = process.env.ADMIN_KEY;
    console.log('\n🔐 [Admin Auth Middleware]');
    console.log('➡️ Incoming admin-key:', incomingKey);
    console.log('✅ Expected ADMIN_KEY:', expectedKey);
    if (!expectedKey) {
        console.error('❌ ADMIN_KEY not set in environment');
        return res.status(500).json({ message: 'Server error: Missing admin key config' });
    }
    if (!incomingKey || incomingKey.trim() !== expectedKey.trim()) {
        console.warn('❌ Admin Key mismatch or missing. Unauthorized access attempt.');
        return res.status(401).json({ message: 'Unauthorized: Invalid Admin Key' });
    }
    console.log('✅ Admin Key validated successfully.\n');
    next();
};
