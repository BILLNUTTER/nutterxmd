// utils/settings/prefix.ts
import UserSettings from '../../models/UserSettings';
export async function getUserPrefix(userId) {
    const settings = await UserSettings.findOne({ userId });
    return settings?.prefix || '.';
}
