"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/PairCode.js
const mongoose_1 = __importDefault(require("mongoose"));
const pairCodeSchema = new mongoose_1.default.Schema({
    code: { type: String, unique: true },
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) }, // 5 mins
    isUsed: { type: Boolean, default: false }
});
exports.default = mongoose_1.default.model('PairCode', pairCodeSchema);
