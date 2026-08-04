import { complaintService } from "../services/complaintService.js";
import { respondWithError } from "../utils/httpError.js";

// GET /api/complaints
export const listComplaints = async (req, res) => {
  try {
    const { complaints, pagination } = await complaintService.list({
      user: req.user,
      query: req.query,
    });

    res.status(200).json({ success: true, complaints, pagination });
  } catch (error) {
    console.error("List complaints error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/complaints/:id
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await complaintService.getById({
      id: req.params.id,
      user: req.user,
    });

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    console.error("Get complaint by ID error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/complaints
export const createComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.create({
      user: req.user,
      body: req.body,
      files: req.files,
    });

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// PUT /api/complaints/:id
export const updateComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.update({
      id: req.params.id,
      user: req.user,
      body: req.body,
      files: req.files,
    });

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// DELETE /api/complaints/:id
export const deleteComplaint = async (req, res) => {
  try {
    await complaintService.remove({ id: req.params.id, user: req.user });

    res
      .status(200)
      .json({ success: true, message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Delete complaint error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/complaints/:id/duplicate
export const duplicateComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.duplicate({
      id: req.params.id,
      user: req.user,
      body: req.body,
    });

    res.status(201).json({
      success: true,
      message: "Complaint duplicated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Duplicate complaint error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/complaints/bulk
export const createBulkComplaints = async (req, res) => {
  try {
    const { summary, results } = await complaintService.createBulk({
      user: req.user,
      complaints: req.body.complaints,
    });

    res.status(201).json({ success: true, summary, results });
  } catch (error) {
    console.error("Create bulk complaints error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/complaints/assigned/me
export const getAssignedComplaints = async (req, res) => {
  try {
    const data = await complaintService.listAssigned(req.user.id);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get assigned complaints error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/complaints/assigned/me/resolved
export const getResolvedComplaints = async (req, res) => {
  try {
    const complaints = await complaintService.listResolvedAssignments(
      req.user.id,
    );

    res.status(200).json({ success: true, data: { complaints } });
  } catch (error) {
    console.error("Get resolved complaints error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// PATCH /api/complaints/:id/status
export const updateComplaintStatus = async (req, res) => {
  try {
    const complaint = await complaintService.updateStatus({
      id: req.params.id,
      technicianId: req.user.id,
      body: req.body,
      files: req.files,
    });

    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Update complaint status error:", error);
    respondWithError(res, error, "Internal server error");
  }
};
