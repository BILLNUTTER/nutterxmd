"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPrefix = getUserPrefix;
// utils/settings/prefix.ts
const UserSettings_1 = __importDefault(require("../../models/UserSettings"));
async function getUserPrefix(userId) {
    const settings = await UserSettings_1.default.findOne({ userId });
    return settings?.prefix || '.';
}
