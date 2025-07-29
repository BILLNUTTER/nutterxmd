import mongoose from 'mongoose';

const FeatureToggleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., 'autoreply'
  enabled: { type: Boolean, default: false },
});

export const FeatureToggle = mongoose.model('FeatureToggle', FeatureToggleSchema);
