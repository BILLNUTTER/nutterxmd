import UserSettings from '../models/UserSettings.js';
// ===============================================
// USER FEATURE FLAGS (Stored in MongoDB)
// ===============================================
export const getUserSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const settings = await UserSettings.findOne({ userId });
        return res.status(200).json(settings || {});
    }
    catch (err) {
        console.error('❌ Failed to fetch user settings:', err);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
};
export const updateUserSetting = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { key, value } = req.body;
        if (typeof key !== 'string') {
            return res.status(400).json({ error: 'Invalid key' });
        }
        const settings = await UserSettings.findOneAndUpdate({ userId }, { $set: { [key]: value } }, { new: true, upsert: true });
        res.status(200).json({
            message: `✅ ${key} updated successfully`,
            settings,
        });
    }
    catch (err) {
        console.error('❌ Failed to update user setting:', err);
        res.status(500).json({ error: 'Failed to update user setting' });
    }
};
// ===============================================
// BOT PREFIX UPDATE
// ===============================================
export const updatePrefix = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { prefix } = req.body;
        if (!prefix || typeof prefix !== 'string') {
            return res.status(400).json({ error: 'Invalid or missing prefix.' });
        }
        const updated = await UserSettings.findOneAndUpdate({ userId }, { prefix }, { new: true, upsert: true });
        return res.status(200).json({
            message: 'Prefix updated successfully',
            data: updated.prefix,
        });
    }
    catch (err) {
        console.error('❌ Failed to update prefix:', err);
        return res.status(500).json({ error: 'Failed to update prefix' });
    }
};
