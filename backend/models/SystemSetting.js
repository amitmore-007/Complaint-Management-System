import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    booleanValue: {
      type: Boolean,
    },
    stringValue: {
      type: String,
      trim: true,
    },
    updatedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

systemSettingSchema.index({ key: 1 }, { unique: true });

const SystemSetting = mongoose.model("SystemSetting", systemSettingSchema);

export default SystemSetting;
