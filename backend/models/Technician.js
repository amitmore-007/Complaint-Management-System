import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema({
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

technicianSchema.methods.isUserActive = function() {
  return this.isActive && this.isVerified;
};

export default mongoose.model('Technician', technicianSchema);
