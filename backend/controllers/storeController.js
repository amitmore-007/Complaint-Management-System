import Store from "../models/Store.js";
import AssetRecord from "../models/AssetRecord.js";

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";
  const cleaned = String(phoneNumber).replace(/\D/g, "");
  // keep last 10 digits for India-like numbers
  if (cleaned.length > 10) return cleaned.slice(-10);
  return cleaned;
};

const normalizeManagers = (managers) => {
  const list = Array.isArray(managers) ? managers : [];
  return list
    .map((m) => ({
      name: String(m?.name || "").trim(),
      phoneNumber: normalizePhoneNumber(m?.phoneNumber || ""),
    }))
    .filter((m) => m.name && m.phoneNumber);
};

const ensureStoreExistsByName = async (storeName) => {
  const name = String(storeName || "").trim();
  if (!name) return null;

  const existing = await Store.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });
  if (existing) return existing;

  try {
    return await Store.create({ name });
  } catch (e) {
    // In case of race/duplicate key, fetch again.
    return await Store.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
  }
};

export const listStores = async (req, res) => {
  try {
    // Keep store list in sync with AssetRecord storeName values.
    // This makes the dropdown work immediately based on existing asset records.
    const distinctStoreNames = await AssetRecord.distinct("storeName");

    for (const rawName of distinctStoreNames) {
      await ensureStoreExistsByName(rawName);
    }

    const { name } = req.query;

    if (name) {
      const store = await Store.findOne({
        name: { $regex: new RegExp(`^${String(name).trim()}$`, "i") },
      }).select("name managers isActive");

      return res.json({
        success: true,
        store,
      });
    }

    const stores = await Store.find({ isActive: true })
      .select("name managers isActive")
      .sort({ name: 1 });

    res.json({
      success: true,
      stores,
    });
  } catch (error) {
    console.error("Error listing stores:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stores",
    });
  }
};

export const updateStoreManagers = async (req, res) => {
  try {
    const { id } = req.params;
    const { managers } = req.body;

    const store = await Store.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    store.managers = normalizeManagers(managers);
    await store.save();

    res.json({
      success: true,
      message: "Store managers updated successfully",
      store: {
        _id: store._id,
        name: store.name,
        managers: store.managers,
      },
    });
  } catch (error) {
    console.error("Error updating store managers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update store managers",
    });
  }
};

export const upsertStoreByName = async (req, res) => {
  try {
    const { storeName } = req.body;
    if (!storeName || !String(storeName).trim()) {
      return res.status(400).json({
        success: false,
        message: "storeName is required",
      });
    }

    const store = await ensureStoreExistsByName(storeName);

    res.json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Error upserting store:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upsert store",
    });
  }
};

export const ensureStoreExistsByNameInternal = ensureStoreExistsByName;
