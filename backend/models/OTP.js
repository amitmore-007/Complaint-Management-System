import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['client', 'technician', 'admin'],
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    expires: 0 // MongoDB will automatically delete documents when expiresAt is reached
  }
}, {
  timestamps: true
});

// Index for automatic cleanup and faster queries
otpSchema.index({ phoneNumber: 1, role: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
