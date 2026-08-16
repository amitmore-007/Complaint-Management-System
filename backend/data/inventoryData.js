import InventoryItem from "../models/InventoryItem.js";

export const inventoryData = {
  findById: (id) => InventoryItem.findById(id),

  findByNameKey: (itemNameKey) =>
    InventoryItem.findOne({ itemNameKey }).sort({ purchaseDate: -1 }),

  findLatestByNameKey: ({ itemNameKey, excludeId }) => {
    const filter = { itemNameKey };
    if (excludeId) filter._id = { $ne: excludeId };
    return InventoryItem.findOne(filter).sort({ purchaseDate: -1 });
  },

  list: ({ page = 1, limit = 30 }) =>
    InventoryItem.find({})
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),

  count: (filter = {}) => InventoryItem.countDocuments(filter),

  create: (data) => InventoryItem.create(data),

  save: (item) => item.save(),

  deleteById: (id) => InventoryItem.findByIdAndDelete(id),

  /** Totals for the inventory dashboard cards. */
  summary: async () => {
    const [row] = await InventoryItem.aggregate([
      {
        $group: {
          _id: null,
          totalPurchaseValue: { $sum: "$totalAmount" },
          gstValue: {
            $sum: { $cond: [{ $eq: ["$gstType", "gst"] }, "$totalAmount", 0] },
          },
          nonGstValue: {
            $sum: {
              $cond: [{ $eq: ["$gstType", "non-gst"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    return {
      totalPurchaseValue: row?.totalPurchaseValue ?? 0,
      gstValue: row?.gstValue ?? 0,
      nonGstValue: row?.nonGstValue ?? 0,
    };
  },

  /**
   * Purchased quantity and spend per item name.
   *
   * The spend totals are what let remaining stock be valued at its weighted
   * average purchase cost. Valuing it at the latest rate instead would
   * misstate the holding whenever the price moved between purchases.
   */
  aggregatePurchased: () =>
    InventoryItem.aggregate([
      { $sort: { purchaseDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$itemNameKey",
          itemId: { $first: "$_id" },
          itemName: { $first: "$itemName" },
          gstType: { $first: "$gstType" },
          gstPercent: { $first: "$gstPercent" },
          latestUnitRate: { $first: "$unitRate" },
          purchasedQty: { $sum: "$quantity" },
          purchasedSubtotal: { $sum: "$subtotal" },
          purchasedTotalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { itemName: 1 } },
    ]),

  collectionName: () => InventoryItem.collection.name,
};
