import mongoose from "mongoose";

const inferCreatorType = (doc) => {
  if (doc.client) return "client";
  if (doc.createdByTechnician) return "technician";
  if (doc.createdByAdmin) return "admin";
  return undefined;
};

/**
 * Where the technician was when they started/resolved. Recorded in every
 * geofence mode — including `warn`, where nothing is blocked — because this is
 * the data an admin needs to pick a real radius before switching to `enforce`.
 */
const statusLocationSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    accuracyMeters: Number,
    capturedAt: Date,
    distanceMeters: Number,
    withinGeofence: Boolean,
    // Why it failed, when it did: OUT_OF_RANGE / WEAK_SIGNAL / STALE_FIX /
    // NO_LOCATION / IMPLAUSIBLE_SPEED.
    failureCode: String,
    // On NO_LOCATION, what the device reported (permission denied, timeout,
    // insecure context) — separates a refusal from a genuine signal problem.
    clientErrorCode: String,
    // Mode in force at the time, so an old record is readable in context.
    mode: String,
    // Server clock at evaluation. Unlike capturedAt this is always present —
    // a rejection with no device fix at all still needs a timestamp.
    recordedAt: Date,
    // Captured on site but sent later by the offline queue.
    queuedOffline: Boolean,
    // Audit only — never used to allow or deny.
    ipAddress: String,
    userAgent: String,
  },
  { _id: false }
);

/**
 * Store manager sign-off for a technician's visit. Informational only — it
 * never blocks Start Work; it exists so a technician (and admin) knows before
 * travelling whether the store has said "not now".
 *
 * Each recipient gets their own link token so the response is attributable.
 * Only a SHA-256 hash of the token is stored.
 */
const storeApprovalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
    },
    requestedAt: Date,
    expiresAt: Date,
    recipients: {
      type: [
        new mongoose.Schema(
          {
            name: String,
            phoneNumber: String,
            tokenHash: String,
            delivered: Boolean,
          },
          {
            _id: false,
            // Never ship link hashes to the apps.
            toJSON: {
              transform: (doc, ret) => {
                delete ret.tokenHash;
                return ret;
              },
            },
          },
        ),
      ],
      default: [],
    },
    respondedAt: Date,
    // The manager who answered, or the admin who approved on their behalf.
    respondedBy: {
      name: String,
      phoneNumber: String,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false },
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    // Where the complaint is. Was previously duplicated as a free-text
    // `location` string that every consumer read instead of this ref.
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "in-progress", "resolved"],
      default: "pending",
    },
    photos: [
      {
        url: String,
        publicId: String,
      },
    ],
    // Whoever raised the complaint, regardless of role. Replaces the three
    // mutually-exclusive refs below (exactly one was ever set, discriminated by
    // creatorType), which forced a 3-way null-coalesce at every read site.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    creatorType: {
      type: String,
      enum: ["client", "technician", "admin"],
      required: true,
    },

    // DEPRECATED — superseded by createdBy. Retained (unused) for one release so
    // a rollback is a code revert. Drop once createdBy is verified in production.
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    technicianNotes: {
      type: String,
      trim: true,
    },
    // Add new fields for resolution proof
    resolutionPhotos: [
      {
        url: String,
        publicId: String,
        originalName: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resolutionVideos: [
      {
        url: String,
        publicId: String,
        originalName: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Photo or PDF of the signed hard-copy complaint sheet, required to resolve.
    // Photos live on Cloudinary (url + publicId); PDFs in a private S3 bucket
    // (key only — viewers fetch a signed URL from GET /complaints/:id/sheet).
    complaintSheet: {
      storage: { type: String, enum: ["cloudinary", "s3"] },
      url: String,
      publicId: String,
      key: String,
      originalName: String,
      mimeType: String,
      resourceType: String,
      uploadedAt: Date,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    materialsUsed: {
      type: Boolean,
      default: false,
    },
    materials: {
      type: [
        new mongoose.Schema(
          {
            item: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "InventoryItem",
            },
            quantity: { type: Number, min: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    resolvedAt: {
      type: Date,
    },

    // ---- geofence ----
    startLocation: {
      type: statusLocationSchema,
      default: undefined,
    },
    resolveLocation: {
      type: statusLocationSchema,
      default: undefined,
    },
    // True once any status update failed its geofence check, in any mode.
    // Drives the admin review queue; `warn` mode flags without blocking.
    geofenceFlagged: {
      type: Boolean,
      default: false,
    },
    /**
     * Every failed attempt, not just the last one. startLocation and
     * resolveLocation hold a single reading each, so a technician who tries
     * three times would overwrite their own history there — and a blocked
     * attempt is recorded nowhere else, since the status update never saves.
     * Capped at the most recent 10 so one bad afternoon cannot grow the
     * document without bound.
     */
    geofenceAttempts: {
      type: [
        new mongoose.Schema(
          {
            action: { type: String, enum: ["start", "resolve"] },
            reading: statusLocationSchema,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    /**
     * Idempotency keys of applied status updates. A technician on a flaky
     * connection retries — or the offline queue replays — with the same key,
     * and the second attempt is a no-op instead of a duplicate media upload.
     * At most two entries per complaint (one start, one resolve).
     */
    statusUpdateKeys: {
      type: [String],
      default: [],
    },
    // Absent when the store has no contact marked "Approves visits".
    storeApproval: {
      type: storeApprovalSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better performance
complaintSchema.index({ complaintId: 1 });
// Serves "my complaints" for every role: { createdBy, creatorType }.
complaintSchema.index({ createdBy: 1, creatorType: 1 });
// Deprecated alongside the fields above — drop with them.
complaintSchema.index({ client: 1 });
complaintSchema.index({ createdByTechnician: 1 });
complaintSchema.index({ createdByAdmin: 1 });
complaintSchema.index({ assignedTechnician: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ creatorType: 1 });
complaintSchema.index({ store: 1 });
// Admin geofence review queue.
complaintSchema.index({ geofenceFlagged: 1, updatedAt: -1 });
// Idempotency lookups on retry/offline replay.
complaintSchema.index({ statusUpdateKeys: 1 });
// Public approval link lookups.
complaintSchema.index(
  { "storeApproval.recipients.tokenHash": 1 },
  { sparse: true },
);

// Backward compatibility for legacy complaints created before creatorType existed.
complaintSchema.pre("validate", function (next) {
  if (!this.creatorType) {
    const inferredCreatorType = inferCreatorType(this);
    if (inferredCreatorType) {
      this.creatorType = inferredCreatorType;
    }
  }
  next();
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
