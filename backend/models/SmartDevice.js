import mongoose from "mongoose";

/**
 * A Tuya-connected smart breaker, keyed by its Tuya device id. Holds the latest
 * known status plus the sync cursor for its energy history.
 */
const smartDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Name as set in the Smart Life app (falls back to Tuya's default name).
    name: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    online: {
      type: Boolean,
      default: false,
    },
    switchOn: {
      type: Boolean,
    },
    voltage: {
      type: Number, // V
    },
    current: {
      type: Number, // A
    },
    power: {
      type: Number, // W
    },
    fault: {
      type: Number,
      default: 0,
    },
    faultLabels: {
      type: [String],
      default: [],
    },
    // When we last read status from Tuya.
    statusSyncedAt: {
      type: Date,
    },
    // Energy logs up to this moment have been imported.
    energySyncedUntil: {
      type: Date,
    },
    lastSyncError: {
      type: String,
    },
  },
  { timestamps: true },
);

const SmartDevice = mongoose.model("SmartDevice", smartDeviceSchema);

export default SmartDevice;
