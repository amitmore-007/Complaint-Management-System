import InventoryItem from "../models/InventoryItem.js";

const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toItemNameKey = (name) => String(name || "").trim().toLowerCase();

const validateGstType = (gstType) => {
  if (gstType !== "gst" && gstType !== "non-gst") {
    throw createHttpError(400, "gstType must be 'gst' or 'non-gst'");
  }
};

// An item name's GST type/% is fixed once it exists — any new/edited entry
// sharing that name is forced to match rather than trusting client input.
const resolveLockedGst = async ({ itemNameKey, gstType, gstPercent, excludeId }) => {
  const filter = { itemNameKey };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await InventoryItem.findOne(filter).sort({ purchaseDate: -1 });
  if (existing) {
    return { gstType: existing.gstType, gstPercent: existing.gstPercent };
  }

  validateGstType(gstType);
  return {
    gstType,
    gstPercent: gstType === "gst" ? Number(gstPercent) || 0 : 0,
  };
};

export const inventoryService = {
  admin: {
    createItem: async ({
      itemName,
      purchaseDate,
      unitRate,
      quantity,
      gstType,
      gstPercent,
      adminId,
    }) => {
      const trimmedName = String(itemName || "").trim();
      if (!trimmedName) {
        throw createHttpError(400, "Item name is required");
      }
      if (!purchaseDate) {
        throw createHttpError(400, "Purchase date is required");
      }

      const safeUnitRate = Number(unitRate);
      const safeQuantity = Number(quantity);
      if (!Number.isFinite(safeUnitRate) || safeUnitRate < 0) {
        throw createHttpError(400, "Unit rate must be a valid non-negative number");
      }
      if (!Number.isFinite(safeQuantity) || safeQuantity < 0) {
        throw createHttpError(400, "Quantity must be a valid non-negative number");
      }

      const itemNameKey = toItemNameKey(trimmedName);
      const lockedGst = await resolveLockedGst({ itemNameKey, gstType, gstPercent });

      const item = new InventoryItem({
        itemName: trimmedName,
        itemNameKey,
        purchaseDate: new Date(purchaseDate),
        unitRate: safeUnitRate,
        quantity: safeQuantity,
        gstType: lockedGst.gstType,
        gstPercent: lockedGst.gstPercent,
        createdBy: adminId,
      });

      await item.save();
      return item;
    },

    listItems: async ({ page = 1, limit = 30 }) => {
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
      const safePage = Math.max(parseInt(page, 10) || 1, 1);

      const records = await InventoryItem.find({})
        .sort({ purchaseDate: -1, createdAt: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit);

      const total = await InventoryItem.countDocuments({});

      const [summaryAgg] = await InventoryItem.aggregate([
        {
          $group: {
            _id: null,
            totalPurchaseValue: { $sum: "$totalAmount" },
            gstValue: {
              $sum: {
                $cond: [{ $eq: ["$gstType", "gst"] }, "$totalAmount", 0],
              },
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
        records,
        pagination: {
          total,
          page: safePage,
          pages: Math.ceil(total / safeLimit),
          limit: safeLimit,
        },
        summary: {
          totalPurchaseValue: summaryAgg?.totalPurchaseValue ?? 0,
          gstValue: summaryAgg?.gstValue ?? 0,
          nonGstValue: summaryAgg?.nonGstValue ?? 0,
        },
      };
    },

    updateItem: async ({ id, itemName, purchaseDate, unitRate, quantity, gstType, gstPercent }) => {
      const item = await InventoryItem.findById(id);
      if (!item) {
        throw createHttpError(404, "Inventory item not found");
      }

      if (itemName != null) {
        const trimmedName = String(itemName).trim();
        if (!trimmedName) {
          throw createHttpError(400, "Item name is required");
        }
        item.itemName = trimmedName;
        item.itemNameKey = toItemNameKey(trimmedName);
      }

      if (purchaseDate != null) item.purchaseDate = new Date(purchaseDate);

      if (unitRate != null) {
        const safeUnitRate = Number(unitRate);
        if (!Number.isFinite(safeUnitRate) || safeUnitRate < 0) {
          throw createHttpError(400, "Unit rate must be a valid non-negative number");
        }
        item.unitRate = safeUnitRate;
      }

      if (quantity != null) {
        const safeQuantity = Number(quantity);
        if (!Number.isFinite(safeQuantity) || safeQuantity < 0) {
          throw createHttpError(400, "Quantity must be a valid non-negative number");
        }
        item.quantity = safeQuantity;
      }

      const lockedGst = await resolveLockedGst({
        itemNameKey: item.itemNameKey,
        gstType: gstType ?? item.gstType,
        gstPercent: gstPercent ?? item.gstPercent,
        excludeId: item._id,
      });
      item.gstType = lockedGst.gstType;
      item.gstPercent = lockedGst.gstPercent;

      await item.save();
      return item;
    },

    deleteItem: async ({ id }) => {
      const item = await InventoryItem.findByIdAndDelete(id);
      if (!item) {
        throw createHttpError(404, "Inventory item not found");
      }
      return item;
    },
  },

  shared: {
    listItemNames: async () => {
      const rows = await InventoryItem.aggregate([
        { $sort: { purchaseDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: "$itemNameKey",
            itemName: { $first: "$itemName" },
            gstType: { $first: "$gstType" },
            gstPercent: { $first: "$gstPercent" },
            latestUnitRate: { $first: "$unitRate" },
          },
        },
        { $sort: { itemName: 1 } },
      ]);

      return rows.map((row) => ({
        itemName: row.itemName,
        gstType: row.gstType,
        gstPercent: row.gstPercent,
        latestUnitRate: row.latestUnitRate,
      }));
    },
  },
};

export const getHttpErrorStatus = (error) => {
  const statusCode = error?.statusCode;
  return Number.isInteger(statusCode) ? statusCode : null;
};
