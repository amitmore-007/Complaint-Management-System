import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  recipient: {
    type: String,
    required: true // Phone number
  },
  type: {
    type: String,
    enum: ['assignment', 'status_update', 'custom'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'pending'
  },
  message: {
    type: String,
    required: true
  },
  twilioMessageId: {
    type: String
  },
  error: {
    type: String
  },
  sentAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Notification', notificationSchema);
