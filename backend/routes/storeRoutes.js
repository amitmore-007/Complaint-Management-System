import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";
import {
  listStores,
  updateStoreManagers,
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

export default router;
