import { userData } from "../data/userData.js";
import { sendAssignmentNotification } from "../config/msg91.js";

const DEFAULT_TECHNICIAN_PHONE_FALLBACK = "9545445133";

const normalizeIndianPhone10Digits = (phoneNumber) => {
  if (!phoneNumber) return "";
  let digits = String(phoneNumber).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.substring(2);
  }
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
};

export const autoAssignComplaintToDefaultTechnician = async ({
  complaint,
  assignedBy,
} = {}) => {
  if (!complaint) return { assigned: false, reason: "missing_complaint" };
  if (complaint.assignedTechnician) {
    return { assigned: false, reason: "already_assigned" };
  }

  const defaultPhoneRaw =
    process.env.DEFAULT_TECHNICIAN_PHONE || DEFAULT_TECHNICIAN_PHONE_FALLBACK;
  const defaultPhone10 = normalizeIndianPhone10Digits(defaultPhoneRaw);
  if (!defaultPhone10) {
    return { assigned: false, reason: "missing_default_phone" };
  }

  const technician = await userData.findActiveByPhoneAndRole({
    phoneNumber: defaultPhone10,
    role: "technician",
  });

  if (!technician) {
    return { assigned: false, reason: "technician_not_found" };
  }

  complaint.assignedTechnician = technician._id;
  complaint.assignedAt = new Date();
  complaint.status = "assigned";
  if (assignedBy) {
    complaint.assignedBy = assignedBy;
  }

  await complaint.save();

  // The template needs the store name; `store` may still be an unpopulated ref
  // when this is called straight after creation.
  await complaint.populate("store", "name");

  try {
    await sendAssignmentNotification(
      technician.phoneNumber,
      technician.name,
      complaint.complaintId,
      complaint.store?.name || "",
      complaint.title || ""
    );
  } catch (err) {
    // Non-fatal: assignment is still successful even if WhatsApp send fails.
    console.error("❌ Default assignment WhatsApp error:", err?.message || err);
  }

  return { assigned: true, technicianId: technician._id };
};
