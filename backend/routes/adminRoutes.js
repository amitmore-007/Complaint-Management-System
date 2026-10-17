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
  getGeofenceModeSetting,
  updateGeofenceModeSetting,
  listGeofenceFlaggedComplaints,
  generateAttendanceToken,
  revokeAttendanceToken,
} from "../controllers/adminController.js";
import {
  authenticateAdmin,
  authenticateAny,
  authorizeRoles,
} from "../middleware/roleAuth.js";
import {
  adminCreateInventoryItem,
  adminListInventoryItems,
  adminUpdateInventoryItem,
  adminDeleteInventoryItem,
  adminGetStockBalance,
} from "../controllers/inventoryController.js";
import {
  adminListSmartDevices,
  adminSyncSmartDevices,
  adminGetSmartDeviceEnergy,
  adminGetSmartDevicePower,
} from "../controllers/smartDeviceController.js";
import { canViewSmartDevices } from "../services/smartDeviceService.js";
import {
  adminApproveStoreVisit,
  adminResendStoreApproval,
} from "../controllers/storeApprovalController.js";

const router = express.Router();

// Auth lives at /api/auth/* (routes/authRoutes.js) for every role.

// dashboard
router.get("/dashboard/stats", authenticateAdmin, getDashboardStats);

// Complaint CRUD is shared across roles at /api/complaints/*.
// Only genuinely admin-only complaint operations live here.
router.post("/complaints/assign", authenticateAdmin, assignComplaint);
router.patch("/complaints/:id/reassign", authenticateAdmin, reassignComplaint);
router.post(
  "/complaints/:id/store-approval/approve",
  authenticateAdmin,
  adminApproveStoreVisit,
);
router.post(
  "/complaints/:id/store-approval/resend",
  authenticateAdmin,
  adminResendStoreApproval,
);
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

router.get(
  "/complaints/geofence-flagged",
  authenticateAdmin,
  listGeofenceFlaggedComplaints,
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
router.get("/settings/geofence-mode", authenticateAdmin, getGeofenceModeSetting);
router.patch(
  "/settings/geofence-mode",
  authenticateAdmin,
  updateGeofenceModeSetting,
);

// billing
// Billing lives at /api/billing/* — listing is shared and role-scoped.

// inventory — view and purchase-entry creation open to technicians too;
// edit/delete stay admin-only.
const authenticateInventoryViewer = [
  authenticateAny,
  authorizeRoles("admin", "technician"),
];
router.get("/inventory", ...authenticateInventoryViewer, adminListInventoryItems);
router.get(
  "/inventory/stock-balance",
  ...authenticateInventoryViewer,
  adminGetStockBalance,
);
router.post("/inventory", ...authenticateInventoryViewer, adminCreateInventoryItem);
router.put("/inventory/:id", authenticateAdmin, adminUpdateInventoryItem);
router.delete("/inventory/:id", authenticateAdmin, adminDeleteInventoryItem);

// smart devices (Tuya smart breakers — energy monitoring) — admins, plus the
// technicians listed in SMART_DEVICE_TECHNICIAN_PHONES.
const authenticateSmartDeviceViewer = [
  authenticateAny,
  (req, res, next) =>
    canViewSmartDevices(req.user)
      ? next()
      : res.status(403).json({
          success: false,
          message: "Access denied. Insufficient permissions.",
        }),
];
router.get("/smart-devices", ...authenticateSmartDeviceViewer, adminListSmartDevices);
router.post(
  "/smart-devices/sync",
  ...authenticateSmartDeviceViewer,
  adminSyncSmartDevices,
);
router.get(
  "/smart-devices/:deviceId/energy",
  ...authenticateSmartDeviceViewer,
  adminGetSmartDeviceEnergy,
);
router.get(
  "/smart-devices/:deviceId/power",
  ...authenticateSmartDeviceViewer,
  adminGetSmartDevicePower,
);

export default router;
