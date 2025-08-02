import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ✅ Extend Request to include userId
export interface AuthRequest extends Request {
  userId?: string;
}

// 🔐 JWT Auth Middleware
export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not set in environment variables.');
      return res.status(500).json({ message: 'Server error: missing JWT secret' });
    }

    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('❌ Invalid token:', err);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// 🛡️ Admin Key Middleware
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const incomingKey = req.header('admin-key')?.trim();
  const expectedKey = process.env.ADMIN_KEY?.trim();

  if (!expectedKey) {
    console.error('❌ ADMIN_KEY is not set in Heroku environment variables.');
    return res.status(500).json({ message: 'Server error: Missing admin key config' });
  }

  if (!incomingKey || incomingKey !== expectedKey) {
    console.warn('❌ Unauthorized: Admin Key missing or incorrect.');
    return res.status(401).json({ message: 'Unauthorized: Invalid Admin Key' });
  }

  next();
};
