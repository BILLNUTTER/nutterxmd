"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const featureController_1 = require("../utils/featureController");
const router = (0, express_1.Router)();
// ✅ Fetch all user feature flags
router.get('/', auth_1.auth, featureController_1.getUserSettings);
// ✅ Dynamically toggle any setting (like 'autobio', 'antidelete')
router.post('/toggle', auth_1.auth, featureController_1.updateUserSetting);
// ✅ Update bot prefix
router.post('/prefix', auth_1.auth, featureController_1.updatePrefix);
exports.default = router;
