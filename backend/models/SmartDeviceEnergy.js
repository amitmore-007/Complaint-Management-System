import mongoose from "mongoose";

/**
 * One energy report from a breaker. Tuya's `add_ele` data point is the energy
 * used since the previous report (≈0.1 kWh chunks), not a running meter total,
 * so consumption over any period is the sum of the chunks inside it, and
 * chunk ÷ time since the previous chunk is the average power in between.
 */
const smartDeviceEnergySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
  },
  eventTime: {
    type: Date,
    required: true,
  },
  kwh: {
    type: Number,
    required: true,
  },
});

// Re-imported overlapping log windows must not double count.
smartDeviceEnergySchema.index({ deviceId: 1, eventTime: 1 }, { unique: true });

const SmartDeviceEnergy = mongoose.model(
  "SmartDeviceEnergy",
  smartDeviceEnergySchema,
);

export default SmartDeviceEnergy;
