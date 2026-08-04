import express from "express";
import {
  assignComplaint,
  reassignComplaint,
  getAllClients,
  getAllTechnicians,
  toggleUserStatus,
  deleteUser,
  getDashboardStats,
  createClient,
  createTechnician,
  updateClient,
  updateTechnician,
  getComplaintAutoAssignSetting,
  updateComplaintAutoAssignSetting,
  getResolvedNotifyContactsSetting,
  updateResolvedNotifyContactsSetting,
  generateAttendanceToken,
  revokeAttendanceToken,
} from "../controllers/adminController.js";
import { authenticateAdmin } from "../middleware/roleAuth.js";
import {
  adminCreateInventoryItem,
  adminListInventoryItems,
  adminUpdateInventoryItem,
  adminDeleteInventoryItem,
  adminGetStockBalance,
} from "../controllers/inventoryController.js";

const router = express.Router();

// Auth lives at /api/auth/* (routes/authRoutes.js) for every role.

// dashboard
router.get("/dashboard/stats", authenticateAdmin, getDashboardStats);

// Complaint CRUD is shared across roles at /api/complaints/*.
// Only genuinely admin-only complaint operations live here.
router.post("/complaints/assign", authenticateAdmin, assignComplaint);
router.patch("/complaints/:id/reassign", authenticateAdmin, reassignComplaint);
router.get(
  "/complaints/auto-assign",
  authenticateAdmin,
  getComplaintAutoAssignSetting,
);
router.patch(
  "/complaints/auto-assign",
  authenticateAdmin,
  updateComplaintAutoAssignSetting,
);

// user management - clients
router.get("/clients", authenticateAdmin, getAllClients);
router.post("/clients", authenticateAdmin, createClient);
router.put("/clients/:id", authenticateAdmin, updateClient);

// user management - technicians
router.get("/technicians", authenticateAdmin, getAllTechnicians);
router.post("/technicians", authenticateAdmin, createTechnician);
router.put("/technicians/:id", authenticateAdmin, updateTechnician);

// user management - general
router.patch(
  "/users/:userId/toggle-status",
  authenticateAdmin,
  toggleUserStatus,
);
router.delete("/users/:userId", authenticateAdmin, deleteUser);

// attendance token management
router.post("/users/:userId/attendance-token", authenticateAdmin, generateAttendanceToken);
router.delete("/users/:userId/attendance-token", authenticateAdmin, revokeAttendanceToken);

// settings
router.get(
  "/settings/resolved-notify-contacts",
  authenticateAdmin,
  getResolvedNotifyContactsSetting,
);
router.patch(
  "/settings/resolved-notify-contacts",
  authenticateAdmin,
  updateResolvedNotifyContactsSetting,
);

// billing
// Billing lives at /api/billing/* — listing is shared and role-scoped.

// inventory
router.get("/inventory", authenticateAdmin, adminListInventoryItems);
router.get("/inventory/stock-balance", authenticateAdmin, adminGetStockBalance);
router.post("/inventory", authenticateAdmin, adminCreateInventoryItem);
router.put("/inventory/:id", authenticateAdmin, adminUpdateInventoryItem);
router.delete("/inventory/:id", authenticateAdmin, adminDeleteInventoryItem);

export default router;
