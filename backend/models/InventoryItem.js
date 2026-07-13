import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemNameKey: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    unitRate: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    gstType: {
      type: String,
      enum: ["gst", "non-gst"],
      required: true,
    },
    gstPercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

inventoryItemSchema.index({ purchaseDate: -1 });

inventoryItemSchema.pre("save", function (next) {
  this.itemNameKey = (this.itemName || "").trim().toLowerCase();

  if (this.gstType === "non-gst") {
    this.gstPercent = 0;
  }

  this.subtotal = this.unitRate * this.quantity;
  this.gstAmount =
    this.gstType === "gst" ? this.subtotal * (this.gstPercent / 100) : 0;
  this.totalAmount = this.subtotal + this.gstAmount;

  next();
});

export default mongoose.model("InventoryItem", inventoryItemSchema);
