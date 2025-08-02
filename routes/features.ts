import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getUserSettings, updateUserSetting, updatePrefix } from '../utils/featureController';
const router = Router();

// ✅ Fetch all user feature flags
router.get('/', auth, getUserSettings);

// ✅ Dynamically toggle any setting (like 'autobio', 'antidelete')
router.post('/toggle', auth, updateUserSetting);

// ✅ Update bot prefix
router.post('/prefix', auth, updatePrefix);

export default router;
