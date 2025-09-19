import mongoose from 'mongoose';

const equipmentItemSchema = new mongoose.Schema({
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isPresent: {
    type: Boolean,
    default: false
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  }
});

const assetRecordSchema = new mongoose.Schema({
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician',
    required: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  equipment: [equipmentItemSchema],
  submissionDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.model('AssetRecord', assetRecordSchema);
