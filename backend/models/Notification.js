import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['assignment', 'status_update', 'completion'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  twilioMessageId: {
    type: String
  },
  sentAt: {
    type: Date
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ complaint: 1, type: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
