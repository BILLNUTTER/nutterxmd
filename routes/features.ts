import { Router } from 'express';
import { getFeatureFlags, updateFeatureFlag, updatePrefix } from '../utils/featureController';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();

router.get('/', auth, getFeatureFlags);
router.post('/toggle', adminAuth, updateFeatureFlag);

// ✅ New route to update prefix
router.post('/prefix', auth, updatePrefix);

export default router;
