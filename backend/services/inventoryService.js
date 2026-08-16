import { inventoryData } from "../data/inventoryData.js";
import { complaintData } from "../data/complaintData.js";
import { createHttpError } from "../utils/httpError.js";

// Purchased qty (summed across every purchase entry for that item name) minus
// used qty (summed across every complaint's recorded materials for that item
// name) — computed fresh each call rather than stored, so it's always
// consistent with the underlying purchase/complaint records.
const computeStockBalances = async () => {
  const purchased = await inventoryData.aggregatePurchased();

  const usedRows = await complaintData.aggregateMaterialUsage(
    inventoryData.collectionName(),
  );

  const usedByKey = new Map(usedRows.map((r) => [r._id, r.usedQty]));

  return purchased.map((row) => {
    const usedQty = usedByKey.get(row._id) ?? 0;
    const remainingQty = row.purchasedQty - usedQty;

    /**
     * Weighted average cost, not the latest rate: an item bought twice at
     * different prices is worth what was actually paid on average, and the
     * latest purchase can be the smaller of the two.
     */
    const avgUnitRate = row.purchasedQty
      ? row.purchasedSubtotal / row.purchasedQty
      : 0;
    const avgUnitRateWithGst = row.purchasedQty
      ? row.purchasedTotalAmount / row.purchasedQty
      : 0;

    // Used can exceed purchased when a technician logs material that was never
    // entered as a purchase. Quantity keeps the negative so the discrepancy
    // stays visible, but stock cannot be worth less than nothing.
    const valuedQty = Math.max(remainingQty, 0);

    return {
      itemId: row.itemId,
      itemName: row.itemName,
      gstType: row.gstType,
      gstPercent: row.gstPercent,
      latestUnitRate: row.latestUnitRate,
      purchasedQty: row.purchasedQty,
      usedQty,
      remainingQty,
      avgUnitRate,
      avgUnitRateWithGst,
      remainingValue: valuedQty * avgUnitRate,
      remainingValueWithGst: valuedQty * avgUnitRateWithGst,
    };
  });
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
  const existing = await inventoryData.findLatestByNameKey({
    itemNameKey,
    excludeId,
  });
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

      const item = await inventoryData.create({
        itemName: trimmedName,
        itemNameKey,
        purchaseDate: new Date(purchaseDate),
        unitRate: safeUnitRate,
        quantity: safeQuantity,
        gstType: lockedGst.gstType,
        gstPercent: lockedGst.gstPercent,
        createdBy: adminId,
      });

      return item;
    },

    listItems: async ({ page = 1, limit = 30 }) => {
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
      const safePage = Math.max(parseInt(page, 10) || 1, 1);

      const records = await inventoryData.list({
        page: safePage,
        limit: safeLimit,
      });

      const total = await inventoryData.count();

      const summary = await inventoryData.summary();

      return {
        records,
        pagination: {
          total,
          page: safePage,
          pages: Math.ceil(total / safeLimit),
          limit: safeLimit,
        },
        summary,
      };
    },

    updateItem: async ({ id, itemName, purchaseDate, unitRate, quantity, gstType, gstPercent }) => {
      const item = await inventoryData.findById(id);
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

      await inventoryData.save(item);
      return item;
    },

    deleteItem: async ({ id }) => {
      const item = await inventoryData.deleteById(id);
      if (!item) {
        throw createHttpError(404, "Inventory item not found");
      }
      return item;
    },

    getStockBalance: async () => {
      return computeStockBalances();
    },
  },

  shared: {
    listItemNames: async () => {
      const balances = await computeStockBalances();

      return balances.map((row) => ({
        itemId: row.itemId,
        itemName: row.itemName,
        gstType: row.gstType,
        gstPercent: row.gstPercent,
        latestUnitRate: row.latestUnitRate,
        remainingQty: row.remainingQty,
      }));
    },
  },
};

