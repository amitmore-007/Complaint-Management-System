import mongoose from "mongoose";

/**
 * Our own count of Tuya API calls per month (IST), so admins can watch the
 * free-plan allowance without logging into Tuya. Approximate: Tuya's official
 * figure (Cloud > Cloud Services) is the source of truth.
 */
const tuyaApiUsageSchema = new mongoose.Schema(
  {
    month: {
      type: String, // yyyy-MM
      required: true,
      unique: true,
    },
    calls: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const TuyaApiUsage = mongoose.model("TuyaApiUsage", tuyaApiUsageSchema);

export default TuyaApiUsage;
