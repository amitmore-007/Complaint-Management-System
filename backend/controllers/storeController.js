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

export const updateStoreGeofence = async (req, res) => {
  try {
    const store = await storeService.updateGeofence({
      id: req.params.id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracyMeters: req.body.accuracyMeters,
      radiusMeters: req.body.radiusMeters,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: store.location
        ? "Store location saved successfully"
        : "Store location cleared",
      store: {
        _id: store._id,
        name: store.name,
        location: store.location,
        geofenceRadiusMeters: store.geofenceRadiusMeters,
      },
    });
  } catch (error) {
    console.error("Error updating store geofence:", error);
    respondWithError(res, error, "Failed to update store location");
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
