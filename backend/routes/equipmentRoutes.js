import express from "express";
import {
  getEquipmentList,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  submitAssetRecord,
  getAssetRecords,
  exportAssetRecordsExcel,
  getTechnicianAssetRecords,
  getClientAssetRecords,
  getAssetRecordById,
  updateAssetRecord,
  deleteAssetRecord,
} from "../controllers/equipmentController.js";
import { authenticateToken } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/roleAuth.js";

const router = express.Router();

// Equipment list - accessible to all authenticated users
router.get("/list", authenticateToken, getEquipmentList);

// Equipment management (Admin only)
router.post(
  "/create",
  authenticateToken,
  authorizeRoles("admin"),
  createEquipment
);
router.put("/:id", authenticateToken, authorizeRoles("admin"), updateEquipment);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  deleteEquipment
);

// Asset records
router.post(
  "/records",
  authenticateToken,
  authorizeRoles("technician"),
  submitAssetRecord
);
router.get(
  "/records",
  authenticateToken,
  authorizeRoles("admin"),
  getAssetRecords
);

// Export all asset records as Excel (Admin only)
router.get(
  "/records/export",
  authenticateToken,
  authorizeRoles("admin"),
  exportAssetRecordsExcel
);
router.get(
  "/records/technician",
  authenticateToken,
  authorizeRoles("technician"),
  getTechnicianAssetRecords
);
router.get(
  "/records/client",
  authenticateToken,
  authorizeRoles("client"),
  getClientAssetRecords
);
router.get("/records/:id", authenticateToken, getAssetRecordById);
router.put(
  "/records/:id",
  authenticateToken,
  authorizeRoles("admin"),
  updateAssetRecord
);
router.delete(
  "/records/:id",
  authenticateToken,
  authorizeRoles("admin"),
  deleteAssetRecord
);

export default router;
