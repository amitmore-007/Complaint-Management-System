import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'resolved'],
    default: 'pending'
  },
  photos: [{
    url: String,
    publicId: String
  }],
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  assignedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  technicianNotes: {
    type: String,
    trim: true
  },
  // Add new fields for resolution proof
  resolutionPhotos: [{
    url: String,
    publicId: String,
    originalName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolutionNotes: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create indexes for better performance
complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ client: 1 });
complaintSchema.index({ assignedTechnician: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ createdAt: -1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;

