import fs from 'fs/promises';
import path from 'path';

const settingsPath = path.join(__dirname, '../data/user_settings.json');

export type BotFeatures = {
  autoReply?: boolean;
};

export type UserSettings = {
  features: BotFeatures;
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const file = await fs.readFile(settingsPath, 'utf-8');
    const allSettings = JSON.parse(file);
    return allSettings[userId] || { features: {} };
  } catch (err) {
    console.error('Error loading settings:', err);
    return { features: {} };
  }
}
