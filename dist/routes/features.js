"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const featureController_1 = require("../utils/featureController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.auth, featureController_1.getFeatureFlags);
router.post('/toggle', auth_1.adminAuth, featureController_1.updateFeatureFlag);
// ✅ New route to update prefix
router.post('/prefix', auth_1.auth, featureController_1.updatePrefix);
exports.default = router;
