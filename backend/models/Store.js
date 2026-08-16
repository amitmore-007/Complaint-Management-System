import mongoose from "mongoose";

const storeManagerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Where the store physically is, used to geofence technician start/resolve.
 * Absent until an admin pins it — an unpinned store is never geofenced, which
 * is what keeps the feature rollout from blocking work on day one.
 */
const storeLocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    // GeoJSON order: [longitude, latitude]. Not [lat, lng].
    coordinates: {
      type: [Number],
      required: true,
    },
    // Accuracy of the reading this pin was captured from, so a sloppy pin is
    // visible rather than silently trusted.
    accuracyMeters: Number,
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    capturedAt: Date,
  },
  { _id: false }
);

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    managers: {
      type: [storeManagerSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    location: {
      type: storeLocationSchema,
      default: undefined,
    },
    /**
     * Not 50m: phone GPS is 5-20m outdoors but degrades to 50-200m indoors,
     * so a tighter fence rejects technicians standing inside the store.
     * Tune per store once warn-mode has collected real distances.
     */
    geofenceRadiusMeters: {
      type: Number,
      default: 150,
      min: 30,
      max: 2000,
    },
  },
  { timestamps: true }
);

storeSchema.index({ name: 1 }, { unique: true });
storeSchema.index({ location: "2dsphere" }, { sparse: true });

export default mongoose.model("Store", storeSchema);
