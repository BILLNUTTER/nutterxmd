"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFeatures = exports.registerFeatureHooks = void 0;
const autoreply_1 = require("./features/autoreply");
const antidelete_1 = require("./features/antidelete");
const groupEvents_1 = require("./features/groupEvents");
const presence_1 = require("./features/presence");
const autobio_1 = require("./features/autobio");
const antilink_1 = require("./features/antilink");
const salute_1 = require("./features/salute");
const autoread_1 = require("./features/autoread");
const autoview_1 = require("./features/autoview");
const features = [
    autoreply_1.feature,
    antidelete_1.feature,
    groupEvents_1.feature,
    presence_1.feature,
    autobio_1.feature,
    antilink_1.feature,
    salute_1.feature,
    autoread_1.feature,
    autoview_1.feature,
    // Add more features here
];
// ✅ Always register all feature hooks – each feature will decide internally if it should act
const registerFeatureHooks = (sock) => {
    for (const feature of features) {
        if (feature.register) {
            try {
                feature.register(sock);
            }
            catch (err) {
                console.error(`❌ Feature "${feature.name}" register() failed:\n\n | nutterxmd`, err);
            }
        }
    }
};
exports.registerFeatureHooks = registerFeatureHooks;
// ✅ Only handle message-based features that are enabled
const handleFeatures = async (sock, msg) => {
    for (const feature of features) {
        if (!feature.enabled || !feature.handle)
            continue;
        try {
            await feature.handle(sock, msg);
        }
        catch (err) {
            console.error(`❌ Feature "${feature.name}" handle() error:\n\n | nutterxmd`, err);
        }
    }
};
exports.handleFeatures = handleFeatures;
