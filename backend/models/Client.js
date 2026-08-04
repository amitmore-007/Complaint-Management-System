// LEGACY — retained ONLY so scripts/migrateToUserModel.js can read the
// pre-merge collections. No application code imports this; identity now lives
// in models/User.js with a `role` discriminator. Safe to delete once the
// migration has been run and verified in production.
import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

clientSchema.methods.isUserActive = function() {
  return this.isActive && this.isVerified;
};

export default mongoose.model('Client', clientSchema);
