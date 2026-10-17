import crypto from "crypto";

import { complaintData } from "../data/complaintData.js";
import { userData } from "../data/userData.js";
import {
  sendStoreVisitApprovalRequest,
  sendStoreVisitApproved,
  sendStoreVisitDeclined,
} from "../config/msg91.js";
import { createHttpError } from "../utils/httpError.js";
import { normalizePhoneNumber } from "../utils/phone.js";

/**
 * Store manager approval of a technician's visit.
 *
 * On every assignment, store contacts marked "Approves visits" get a WhatsApp
 * link. Their answer goes to the technician and the admins, so nobody travels
 * to a store that has said "not now". Purely informational: Start Work is
 * never blocked, and an admin can approve on the store's behalf.
 */

const LINK_TTL_MS = 72 * 60 * 60 * 1000;
const MAX_REASON_LENGTH = 500;
const RESPONDABLE_STATUSES = ["assigned", "in-progress"];

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// 128 bits, 22 URL-safe characters — short enough for a WhatsApp URL button.
const newToken = () => crypto.randomBytes(16).toString("base64url");

/** One entry per phone, keeping the first (most specific) name. */
const uniqueByPhone = (people) => {
  const byPhone = new Map();
  for (const { name, phoneNumber } of people) {
    const phone = normalizePhoneNumber(phoneNumber);
    if (phone && !byPhone.has(phone)) {
      byPhone.set(phone, { name: name || "", phoneNumber: phone });
    }
  }
  return [...byPhone.values()];
};

const approversFor = (store) =>
  uniqueByPhone((store?.managers ?? []).filter((m) => m.approvesVisits));

/**
 * The admin who assigned the complaint, or every active admin when nobody did
 * (auto-assign) or that admin is no longer active.
 */
const adminRecipients = async (complaint) => {
  const assignedById = complaint.assignedBy?._id ?? complaint.assignedBy;
  if (assignedById) {
    const admin = await userData.findByIdAndRole({ id: assignedById, role: "admin" });
    if (admin?.isActive && admin.phoneNumber) return [admin];
  }
  return userData.listActiveByRole("admin");
};

/** Tell the technician (and optionally the admins) what the store decided. */
const notifyOutcome = async (complaint, { includeAdmins }) => {
  const approval = complaint.storeApproval;
  const technician = complaint.assignedTechnician;
  const people = [];
  if (technician?.phoneNumber) people.push(technician);
  if (includeAdmins) people.push(...(await adminRecipients(complaint)));

  const send =
    approval.status === "approved" ? sendStoreVisitApproved : sendStoreVisitDeclined;
  const results = await Promise.allSettled(
    uniqueByPhone(people).map((person) =>
      send({
        phoneNumber: person.phoneNumber,
        recipientName: person.name,
        complaintId: complaint.complaintId,
        storeName: complaint.store?.name,
        approvedBy: approval.respondedBy?.name,
        declinedBy: approval.respondedBy?.name,
        reason: approval.reason,
      }),
    ),
  );

  results.forEach((result) => {
    if (result.status === "rejected" || !result.value?.success) {
      console.error(
        `Store approval ${approval.status} notification failed for ${complaint.complaintId}:`,
        result.reason?.message || result.value?.error,
      );
    }
  });
};

const toPublicView = (complaint, tokenHash) => {
  const approval = complaint.storeApproval;
  const recipient = approval.recipients.find((r) => r.tokenHash === tokenHash);

  return {
    complaintId: complaint.complaintId,
    title: complaint.title,
    storeName: complaint.store?.name || "",
    complaintStatus: complaint.status,
    assignedAt: complaint.assignedAt,
    technician: {
      name: complaint.assignedTechnician?.name || "",
      phoneNumber: complaint.assignedTechnician?.phoneNumber || "",
    },
    recipientName: recipient?.name || "",
    approval: {
      status: approval.status,
      respondedAt: approval.respondedAt,
      respondedBy: approval.respondedBy?.name || "",
      reason: approval.reason || "",
      expired:
        approval.status === "pending" &&
        Boolean(approval.expiresAt) &&
        approval.expiresAt.getTime() < Date.now(),
    },
  };
};

const findByToken = async (token) => {
  const tokenHash = hashToken(token);
  const complaint = await complaintData.findByApprovalTokenHash(tokenHash);
  // A reassignment issues fresh links, so an old one simply stops matching.
  if (!complaint?.storeApproval) {
    throw createHttpError(404, "This link is no longer valid.");
  }
  return { complaint, tokenHash };
};

/**
 * Send approval links for the complaint's current assignment, replacing any
 * earlier request. `complaint` must be populated (store managers, technician).
 */
const requestApproval = async (complaint) => {
  const approvers = approversFor(complaint.store);

  if (!approvers.length) {
    // A previous answer was about a different technician — drop it.
    if (complaint.storeApproval) {
      complaint.storeApproval = undefined;
      await complaintData.save(complaint);
    }
    return { requested: false };
  }

  const now = new Date();
  const links = approvers.map((approver) => ({ ...approver, token: newToken() }));

  complaint.storeApproval = {
    status: "pending",
    requestedAt: now,
    expiresAt: new Date(now.getTime() + LINK_TTL_MS),
    recipients: links.map(({ name, phoneNumber, token }) => ({
      name,
      phoneNumber,
      tokenHash: hashToken(token),
      delivered: false,
    })),
  };
  // Saved before sending, so a link tapped instantly already resolves.
  await complaintData.save(complaint);

  const results = await Promise.allSettled(
    links.map((link) =>
      sendStoreVisitApprovalRequest({
        phoneNumber: link.phoneNumber,
        managerName: link.name,
        complaintId: complaint.complaintId,
        issueTitle: complaint.title,
        storeName: complaint.store?.name,
        technicianName: complaint.assignedTechnician?.name,
        technicianPhone: complaint.assignedTechnician?.phoneNumber,
        token: link.token,
      }),
    ),
  );

  // Local testing only: the WhatsApp button always opens the production
  // domain, so print the links for the local frontend. Never enable in
  // production — anyone reading the logs could answer for the store.
  if (process.env.LOG_STORE_APPROVAL_LINKS === "true") {
    const base = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
    links.forEach((link) =>
      console.log(`🔗 Store approval link for ${link.name} (${link.phoneNumber}): ${base}/store-approval/${link.token}`),
    );
  }

  results.forEach((result, i) => {
    const delivered = result.status === "fulfilled" && result.value?.success;
    complaint.storeApproval.recipients[i].delivered = delivered;
    if (!delivered) {
      console.error(
        `Store approval request to ${links[i].phoneNumber} failed for ${complaint.complaintId}:`,
        result.reason?.message || result.value?.error,
      );
    }
  });
  await complaintData.save(complaint);

  return { requested: true };
};

export const storeApprovalService = {
  requestApproval,

  /** For assignment flows: a messaging failure must never fail the assignment. */
  requestApprovalSafely: async (complaint) => {
    try {
      return await requestApproval(complaint);
    } catch (error) {
      console.error(
        `Store approval request error for ${complaint?.complaintId}:`,
        error.message,
      );
      return { requested: false };
    }
  },

  getByToken: async (token) => {
    const { complaint, tokenHash } = await findByToken(token);
    return toPublicView(complaint, tokenHash);
  },

  respond: async ({ token, decision, reason }) => {
    if (!["approve", "decline"].includes(decision)) {
      throw createHttpError(400, "Decision must be approve or decline");
    }

    const { complaint, tokenHash } = await findByToken(token);
    const approval = complaint.storeApproval;

    if (!RESPONDABLE_STATUSES.includes(complaint.status)) {
      throw createHttpError(409, "This complaint is already resolved.");
    }
    if (approval.status !== "pending") {
      throw createHttpError(409, `This visit was already ${approval.status}.`);
    }
    if (approval.expiresAt && approval.expiresAt.getTime() < Date.now()) {
      throw createHttpError(410, "This link has expired. Please contact the admin.");
    }

    const recipient = approval.recipients.find((r) => r.tokenHash === tokenHash);
    const declined = decision === "decline";
    const set = {
      "storeApproval.status": declined ? "declined" : "approved",
      "storeApproval.respondedAt": new Date(),
      "storeApproval.respondedBy": {
        name: recipient?.name || "Store",
        phoneNumber: recipient?.phoneNumber || "",
      },
    };
    const trimmedReason = String(reason || "").trim().slice(0, MAX_REASON_LENGTH);
    if (declined && trimmedReason) set["storeApproval.reason"] = trimmedReason;

    const updated = await complaintData.respondToStoreApproval({ tokenHash, set });
    if (!updated) {
      // Another store contact answered a moment earlier.
      const { complaint: latest } = await findByToken(token);
      throw createHttpError(409, `This visit was already ${latest.storeApproval.status}.`);
    }

    try {
      await notifyOutcome(updated, { includeAdmins: true });
    } catch (error) {
      console.error(`Store approval notify error for ${updated.complaintId}:`, error.message);
    }

    return toPublicView(updated, tokenHash);
  },

  /** Admin fallback when the store does not answer (or after a phone call). */
  approveOnBehalf: async ({ complaintId, adminId }) => {
    const complaint = await complaintData.findByIdPopulated(complaintId);
    if (!complaint) throw createHttpError(404, "Complaint not found");
    if (!complaint.storeApproval) {
      throw createHttpError(400, "No store approval was requested for this complaint");
    }
    if (complaint.storeApproval.status === "approved") {
      throw createHttpError(400, "The visit is already approved");
    }
    if (!RESPONDABLE_STATUSES.includes(complaint.status)) {
      throw createHttpError(400, "Only assigned or in-progress complaints can be approved");
    }

    const admin = await userData.findById(adminId);
    complaint.storeApproval.status = "approved";
    complaint.storeApproval.respondedAt = new Date();
    complaint.storeApproval.respondedBy = {
      name: `${admin?.name || "Admin"} (admin)`,
      phoneNumber: admin?.phoneNumber || "",
    };
    complaint.storeApproval.overriddenBy = adminId;
    complaint.storeApproval.reason = undefined;
    await complaintData.save(complaint);

    try {
      await notifyOutcome(complaint, { includeAdmins: false });
    } catch (error) {
      console.error(`Store approval notify error for ${complaint.complaintId}:`, error.message);
    }

    return complaint;
  },

  /** Send fresh links, e.g. when a manager lost the message or it expired. */
  resend: async ({ complaintId }) => {
    const complaint = await complaintData.findByIdPopulated(complaintId);
    if (!complaint) throw createHttpError(404, "Complaint not found");
    if (!RESPONDABLE_STATUSES.includes(complaint.status)) {
      throw createHttpError(400, "Only assigned or in-progress complaints can be sent for approval");
    }

    const { requested } = await requestApproval(complaint);
    if (!requested) {
      throw createHttpError(
        400,
        'No contact at this store is marked "Approves visits"',
      );
    }
    return complaint;
  },
};
