import { complaintData } from "../data/complaintData.js";
import { userData } from "../data/userData.js";
import { sendAssignmentNotification } from "../config/msg91.js";
import { createHttpError } from "../utils/httpError.js";

const REASSIGNABLE = ["assigned", "in-progress"];

const requireActiveTechnician = async (technicianId) => {
  const technician = await userData.findByIdAndRole({
    id: technicianId,
    role: "technician",
  });

  if (!technician) throw createHttpError(404, "Technician not found");
  if (!technician.isActive) {
    throw createHttpError(400, "Technician is not active");
  }

  return technician;
};

/** Delivery failure must never fail the assignment itself. */
const notifyTechnician = async (technician, complaint, label) => {
  if (!technician.phoneNumber) return;

  try {
    const result = await sendAssignmentNotification(
      technician.phoneNumber,
      technician.name,
      complaint.complaintId,
      complaint.store?.name || "",
      complaint.title || "",
    );

    if (!result.success) {
      console.error(`Failed to send ${label} notification:`, result.error);
    }
  } catch (error) {
    console.error(`${label} notification error:`, error);
  }
};

export const assignmentService = {
  assign: async ({ complaintId, technicianId, adminId }) => {
    if (!complaintId || !technicianId) {
      throw createHttpError(
        400,
        "Complaint ID and Technician ID are required",
      );
    }

    const complaint = await complaintData.findByIdPopulated(complaintId);
    if (!complaint) throw createHttpError(404, "Complaint not found");

    if (complaint.status !== "pending") {
      throw createHttpError(400, "Complaint is already assigned or completed");
    }

    const technician = await requireActiveTechnician(technicianId);

    complaint.assignedTechnician = technicianId;
    complaint.assignedBy = adminId;
    complaint.assignedAt = new Date();
    complaint.status = "assigned";

    await complaintData.save(complaint);
    await notifyTechnician(technician, complaint, "assignment");

    return complaint;
  },

  reassign: async ({ complaintId, technicianId, adminId }) => {
    if (!technicianId) throw createHttpError(400, "Technician ID is required");

    const complaint = await complaintData.findByIdPopulated(complaintId);
    if (!complaint) throw createHttpError(404, "Complaint not found");

    if (!REASSIGNABLE.includes(complaint.status)) {
      throw createHttpError(
        400,
        "Only assigned or in-progress complaints can be reassigned",
      );
    }

    const technician = await requireActiveTechnician(technicianId);

    // Reset to a fresh assigned state for the new technician.
    complaint.assignedTechnician = technicianId;
    complaint.assignedBy = adminId;
    complaint.assignedAt = new Date();
    complaint.status = "assigned";
    complaint.startedAt = null;

    await complaintData.save(complaint);
    await notifyTechnician(technician, complaint, "reassignment");

    return complaint;
  }
};
