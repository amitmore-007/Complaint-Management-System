import mongoose from "mongoose";

export const USER_ROLES = ["admin", "client", "technician"];

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    // Bumped by "logout all devices"; a token whose tokenVersion no longer
    // matches is rejected. Previously admin-only — now every role can be
    // force-logged-out.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    attendanceToken: { type: String, sparse: true, select: false },
    attendancePin: { type: String, select: false },
    // Replaces the write-only Admin.createdClients/createdTechnicians arrays.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Compound, NOT a bare unique on phoneNumber: the three source collections each
// had their own unique index, so the same number can legitimately exist once
// per role. A global unique would reject that existing production data.
userSchema.index({ phoneNumber: 1, role: 1 }, { unique: true });
userSchema.index({ attendanceToken: 1 }, { unique: true, sparse: true });

userSchema.methods.isUserActive = function () {
  return this.isActive && this.isVerified;
};

export default mongoose.model("User", userSchema);
