import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: false // Allow same phone for different roles
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['client', 'technician', 'admin'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for phone number and role combination
userSchema.index({ phoneNumber: 1, role: 1 }, { unique: true });

// Instance method to check if user is active
userSchema.methods.isUserActive = function() {
  return this.isActive && this.isVerified;
};

const User = mongoose.model('User', userSchema);

export default User;
