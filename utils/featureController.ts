import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import UserSettings from '../models/UserSettings';

const envPath = path.resolve(__dirname, '../../.env');

// ✅ Extend Express Request to include `user`
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

// ✅ Parse the .env into key-value pairs
const parseEnv = (envContent: string): Record<string, string> => {
  return Object.fromEntries(
    envContent
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => {
        const [key, val] = line.split('=');
        return [key.trim(), val.trim()];
      })
  );
};

// ===============================================
// GLOBAL FEATURE FLAGS (from .env)
// ===============================================
export const getFeatureFlags = async (req: Request, res: Response) => {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const flags = parseEnv(envContent);
    res.json(flags);
  } catch (error) {
    console.error('Failed to read .env:', error);
    res.status(500).json({ error: 'Unable to load feature flags' });
  }
};

export const updateFeatureFlag = async (req: Request, res: Response) => {
  const { key, value } = req.body;

  if (typeof key !== 'string' || typeof value !== 'string') {
    return res.status(400).json({ error: 'Invalid key or value' });
  }

  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Append new key
      if (!envContent.endsWith('\n')) envContent += '\n';
      envContent += `${key}=${value}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    res.json({ message: `✅ ${key} set to ${value}` });
  } catch (err) {
    console.error('Failed to update .env:', err);
    res.status(500).json({ error: 'Failed to update .env file' });
  }
};

// ===============================================
// USER SETTINGS (Prefix, etc.)
// ===============================================
export const updatePrefix = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { prefix } = req.body;

    if (!prefix || typeof prefix !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing prefix.' });
    }

    const updated = await UserSettings.findOneAndUpdate(
      { userId },
      { prefix },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: 'Prefix updated successfully',
      data: updated.prefix,
    });
  } catch (err) {
    console.error('❌ Failed to update prefix:', err);
    return res.status(500).json({ error: 'Failed to update prefix' });
  }
};

export const getUserSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const settings = await UserSettings.findOne({ userId });
    res.status(200).json(settings || {});
  } catch (err) {
    console.error('❌ Failed to fetch user settings:', err);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
};
