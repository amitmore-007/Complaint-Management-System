import { billingService } from "../services/billingService.js";
import { respondWithError } from "../utils/httpError.js";

export const createBillingRecord = async (req, res) => {
  try {
    const record = await billingService.technician.createBillingRecord({
      technicianId: req.user.id,
      complaintId: req.body.complaintId,
      isComplaintResolved: req.body.isComplaintResolved,
      files: req.files,
    });

    return res.status(201).json({
      success: true,
      message: "Billing record submitted",
      record,
    });
  } catch (error) {
    console.error("Create billing record error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};

// Technician sees their own submissions, admin sees all — scoped server-side.
export const listBillingRecords = async (req, res) => {
  try {
    const { records, pagination } = await billingService.listBillingRecords({
      role: req.user.role,
      userId: req.user.id,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      records,
      pagination,
    });
  } catch (error) {
    console.error("List billing records error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const getBillingRecord = async (req, res) => {
  try {
    const record = await billingService.admin.getBillingRecord({
      id: req.params.id,
    });

    return res.status(200).json({
      success: true,
      record,
    });
  } catch (error) {
    console.error("Get admin billing record error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};

export const updateBillingRecord = async (req, res) => {
  try {
    const record = await billingService.admin.updateBillingRecord({
      adminId: req.user.id,
      id: req.params.id,
      materialsUsed: req.body.materialsUsed,
      isComplaintResolved: req.body.isComplaintResolved,
      materials: req.body.materials,
    });

    return res.status(200).json({
      success: true,
      message: "Billing record updated",
      record,
    });
  } catch (error) {
    console.error("Update admin billing record error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};
