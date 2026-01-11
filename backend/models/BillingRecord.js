import mongoose from "mongoose";

const billPhotoSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    originalName: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    price: {
      type: Number,
      min: 0,
    },
    billPhoto: billPhotoSchema,
  },
  { _id: false }
);

const billingRecordSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      unique: true,
      index: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
      index: true,
    },
    isComplaintResolved: {
      type: Boolean,
      default: false,
    },
    materialsUsed: {
      type: Boolean,
      default: false,
    },
    materials: {
      type: [materialSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    updatedByAdminAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

billingRecordSchema.index({ technician: 1, submittedAt: -1 });

export default mongoose.model("BillingRecord", billingRecordSchema);
