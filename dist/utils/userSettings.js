import fs from 'fs/promises';
import path from 'path';
const settingsPath = path.join(__dirname, '../data/user_settings.json');
export async function getUserSettings(userId) {
    try {
        const file = await fs.readFile(settingsPath, 'utf-8');
        const allSettings = JSON.parse(file);
        return allSettings[userId] || { features: {} };
    }
    catch (err) {
        console.error('Error loading settings:', err);
        return { features: {} };
    }
}
