import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
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
  },
  // Add tracking for created users
  createdClients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  }],
  createdTechnicians: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician'
  }]
}, {
  timestamps: true
});

adminSchema.methods.isUserActive = function() {
  return this.isActive && this.isVerified;
};

export default mongoose.model('Admin', adminSchema);
