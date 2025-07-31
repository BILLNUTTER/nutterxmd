"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true, index: true, unique: true },
    isActive: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    sessionId: { type: String, default: null },
    expiryDate: { type: Date, default: null },
}, {
    timestamps: true
});
exports.default = (0, mongoose_1.model)('User', userSchema);
