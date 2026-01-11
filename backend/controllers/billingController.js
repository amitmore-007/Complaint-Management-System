import {
  billingService,
  getHttpErrorStatus,
} from "../services/billingService.js";

export const technicianCreateBillingRecord = async (req, res) => {
  try {
    const record = await billingService.technician.createBillingRecord({
      technicianId: req.user.id,
      complaintId: req.body.complaintId,
      isComplaintResolved: req.body.isComplaintResolved,
      materialsUsed: req.body.materialsUsed,
      materials: req.body.materials,
      files: req.files,
    });

    return res.status(201).json({
      success: true,
      message: "Billing record submitted",
      record,
    });
  } catch (error) {
    console.error("Create billing record error:", error);
    const status = getHttpErrorStatus(error) ?? 500;
    return res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error" : error.message,
    });
  }
};

export const technicianListBillingRecords = async (req, res) => {
  try {
    const { records, pagination } =
      await billingService.technician.listBillingRecords({
        technicianId: req.user.id,
        page: req.query.page,
        limit: req.query.limit,
      });

    return res.status(200).json({
      success: true,
      records,
      pagination,
    });
  } catch (error) {
    console.error("List technician billing records error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const adminListBillingRecords = async (req, res) => {
  try {
    const { records, pagination } =
      await billingService.admin.listBillingRecords({
        page: req.query.page,
        limit: req.query.limit,
      });

    return res.status(200).json({
      success: true,
      records,
      pagination,
    });
  } catch (error) {
    console.error("List admin billing records error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const adminGetBillingRecord = async (req, res) => {
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
    const status = getHttpErrorStatus(error) ?? 500;
    return res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error" : error.message,
    });
  }
};

export const adminUpdateBillingRecord = async (req, res) => {
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
    const status = getHttpErrorStatus(error) ?? 500;
    return res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error" : error.message,
    });
  }
};
