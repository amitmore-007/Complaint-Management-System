import mongoose from 'mongoose';

const subFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, default: '', trim: true },
    subFields: { type: [subFieldSchema], default: [] },
  },
  { _id: false }
);

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  fields: { type: [fieldSchema], default: [] },
}, {
  timestamps: true
});

export default mongoose.model('Equipment', equipmentSchema);
  