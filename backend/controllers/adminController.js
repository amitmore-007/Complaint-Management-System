import { assignmentService } from "../services/assignmentService.js";
import { userService } from "../services/userService.js";
import { dashboardService } from "../services/dashboardService.js";
import { settingsService } from "../services/settingsService.js";
import { respondWithError } from "../utils/httpError.js";

/**
 * HTTP only. Business rules live in services/, database access in data/.
 * This file covers the admin-exclusive surface: assignment, user management,
 * dashboard and settings. Complaint CRUD is shared at /api/complaints.
 */

// ============================================
// ASSIGNMENT
// ============================================

export const assignComplaint = async (req, res) => {
  try {
    const complaint = await assignmentService.assign({
      complaintId: req.body.complaintId,
      technicianId: req.body.technicianId,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
      complaint,
    });
  } catch (error) {
    console.error("Assign complaint error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const reassignComplaint = async (req, res) => {
  try {
    const complaint = await assignmentService.reassign({
      complaintId: req.params.id,
      technicianId: req.body.technicianId,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Complaint reassigned successfully",
      complaint,
    });
  } catch (error) {
    console.error("Reassign complaint error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// ============================================
// SETTINGS
// ============================================

export const getComplaintAutoAssignSetting = async (req, res) => {
  try {
    const setting = await settingsService.getAutoAssign();
    res.status(200).json({ success: true, setting });
  } catch (error) {
    console.error("Get complaint auto-assign setting error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const updateComplaintAutoAssignSetting = async (req, res) => {
  try {
    const setting = await settingsService.setAutoAssign({
      enabled: req.body.enabled,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: `Auto assign ${req.body.enabled ? "enabled" : "disabled"} successfully`,
      setting,
    });
  } catch (error) {
    console.error("Update complaint auto-assign setting error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const getResolvedNotifyContactsSetting = async (req, res) => {
  try {
    const setting = await settingsService.getResolvedNotifyContacts();
    res.status(200).json({ success: true, setting });
  } catch (error) {
    console.error("Get resolved notify contacts error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const updateResolvedNotifyContactsSetting = async (req, res) => {
  try {
    const setting = await settingsService.setResolvedNotifyContacts({
      contacts: req.body.contacts,
      adminId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Resolved notification contacts updated successfully",
      setting,
    });
  } catch (error) {
    console.error("Update resolved notify contacts error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

export const getAllClients = async (req, res) => {
  try {
    const { clients, pagination } = await userService.listClients(req.query);
    res.status(200).json({ success: true, clients, pagination });
  } catch (error) {
    console.error("Get all clients error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const getAllTechnicians = async (req, res) => {
  try {
    const { technicians, pagination } = await userService.listTechnicians(
      req.query,
    );
    res.status(200).json({ success: true, technicians, pagination });
  } catch (error) {
    console.error("Get all technicians error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const createClient = async (req, res) => {
  try {
    const client = await userService.createClient({
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      adminId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      client: {
        id: client._id,
        name: client.name,
        phoneNumber: client.phoneNumber,
        isActive: client.isActive,
        createdAt: client.createdAt,
      },
    });
  } catch (error) {
    console.error("Create client error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const createTechnician = async (req, res) => {
  try {
    const technician = await userService.createTechnician({
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      adminId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Technician created successfully",
      technician: {
        id: technician._id,
        name: technician.name,
        phoneNumber: technician.phoneNumber,
        isActive: technician.isActive,
        createdAt: technician.createdAt,
      },
    });
  } catch (error) {
    console.error("Create technician error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const updateClient = async (req, res) => {
  try {
    const client = await userService.updateClient({
      id: req.params.id,
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      isActive: req.body.isActive,
    });

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      client: {
        id: client._id,
        name: client.name,
        phoneNumber: client.phoneNumber,
        isActive: client.isActive,
      },
    });
  } catch (error) {
    console.error("Update client error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const updateTechnician = async (req, res) => {
  try {
    const technician = await userService.updateTechnician({
      id: req.params.id,
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      isActive: req.body.isActive,
    });

    res.status(200).json({
      success: true,
      message: "Technician updated successfully",
      technician: {
        id: technician._id,
        name: technician.name,
        phoneNumber: technician.phoneNumber,
        isActive: technician.isActive,
      },
    });
  } catch (error) {
    console.error("Update technician error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await userService.toggleStatus({
      userId: req.params.userId,
      isActive: req.body.isActive,
    });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const deleteUser = async (req, res) => {
  try {
    await userService.remove(req.params.userId);
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

export const generateAttendanceToken = async (req, res) => {
  try {
    const result = await userService.generateAttendanceToken({
      userId: req.params.userId,
      userRole: req.body.userRole,
      pin: req.body.pin,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Generate attendance token error:", error);
    respondWithError(res, error, "Internal server error.");
  }
};

export const revokeAttendanceToken = async (req, res) => {
  try {
    await userService.revokeAttendanceToken({
      userId: req.params.userId,
      userRole: req.body.userRole,
    });

    res.json({ success: true, message: "Attendance access revoked." });
  } catch (error) {
    console.error("Revoke attendance token error:", error);
    respondWithError(res, error, "Internal server error.");
  }
};

// ============================================
// DASHBOARD
// ============================================

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats({ month: req.query.month });
    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    respondWithError(res, error, "Internal server error");
  }
};
