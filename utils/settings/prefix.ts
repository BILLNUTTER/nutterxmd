// utils/settings/prefix.ts
import UserSettings from '../../models/UserSettings';

export async function getUserPrefix(userId: string): Promise<string> {
    const settings = await UserSettings.findOne({ userId });
    return settings?.prefix || '.';
}
