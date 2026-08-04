import { storeService } from "../services/storeService.js";
import { respondWithError } from "../utils/httpError.js";

export const listStores = async (req, res) => {
  try {
    const result = await storeService.list({ name: req.query.name });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error listing stores:", error);
    respondWithError(res, error, "Failed to fetch stores");
  }
};

export const updateStoreManagers = async (req, res) => {
  try {
    const store = await storeService.updateManagers({
      id: req.params.id,
      managers: req.body.managers,
    });

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
    respondWithError(res, error, "Failed to update store managers");
  }
};

export const upsertStoreByName = async (req, res) => {
  try {
    const store = await storeService.upsertByName(req.body.storeName);
    res.json({ success: true, store });
  } catch (error) {
    console.error("Error upserting store:", error);
    respondWithError(res, error, "Failed to upsert store");
  }
};
