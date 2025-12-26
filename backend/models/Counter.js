import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

counterSchema.index({ key: 1 }, { unique: true });

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
