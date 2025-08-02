import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { getUserSettings, updateUserSetting, updatePrefix } from '../utils/featureController.js';
const router = Router();
// ✅ Fetch all user feature flags
router.get('/', auth, getUserSettings);
// ✅ Dynamically toggle any setting (like 'autobio', 'antidelete')
router.post('/toggle', auth, updateUserSetting);
// ✅ Update bot prefix
router.post('/prefix', auth, updatePrefix);
export default router;
