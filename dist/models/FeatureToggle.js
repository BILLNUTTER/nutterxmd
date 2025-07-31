"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureToggle = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FeatureToggleSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true }, // e.g., 'autoreply'
    enabled: { type: Boolean, default: false },
});
exports.FeatureToggle = mongoose_1.default.model('FeatureToggle', FeatureToggleSchema);
