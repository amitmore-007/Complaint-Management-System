import express from "express";
import { authenticateToken } from "../middleware/roleAuth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";
import {
  listStores,
  updateStoreManagers,
  updateStoreGeofence,
  upsertStoreByName,
} from "../controllers/storeController.js";

const router = express.Router();

// Accessible to all authenticated users (for complaint dropdown)
router.get("/", authenticateToken, listStores);

// Admin can upsert stores by name if needed
router.post(
  "/upsert",
  authenticateToken,
  authorizeRoles("admin"),
  upsertStoreByName
);

// Admin can update store outlet managers
router.put(
  "/:id/managers",
  authenticateToken,
  authorizeRoles("admin"),
  updateStoreManagers
);

// Admin pins the store on the map — this is what turns geofencing on for it
router.put(
  "/:id/geofence",
  authenticateToken,
  authorizeRoles("admin"),
  updateStoreGeofence
);

export default router;
