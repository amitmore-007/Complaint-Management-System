import { complaintData, isValidId } from "../data/complaintData.js";
import { storeData } from "../data/storeData.js";
import { userData } from "../data/userData.js";
import { inventoryData } from "../data/inventoryData.js";
import { attendanceService } from "./attendanceService.js";
import {
  uploadToCloudinary,
  uploadVideoToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { sendStatusUpdateNotification } from "../config/msg91.js";
import { generateNextComplaintId } from "../utils/complaintId.js";
import { autoAssignComplaintToDefaultTechnician } from "../utils/autoAssign.js";
import {
  getComplaintAutoAssignEnabled,
  getComplaintGeofenceMode,
  getResolvedNotifyContacts,
} from "./settingsService.js";
import { createHttpError } from "../utils/httpError.js";
import {
  evaluateGeofence,
  geofenceFailureMessage,
} from "../utils/geofence.js";

const MAX_PHOTOS = 5;
const VALID_STATUSES = ["assigned", "in-progress", "resolved"];
const VALID_TRANSITIONS = {
  assigned: ["in-progress"],
  "in-progress": ["resolved"],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeIndianPhone10Digits = (phoneNumber) => {
  if (!phoneNumber) return "";

  let digits = String(phoneNumber).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits;
};

/**
 * Who may edit or delete a complaint.
 *  - admin  : unrestricted
 *  - others : only their own, and only while it is still pending
 */
const assertCanMutate = (complaint, user) => {
  if (user.role === "admin") return;

  const isOwner = String(complaint.createdBy ?? "") === String(user.id);
  if (!isOwner) {
    throw createHttpError(404, "Complaint not found or unauthorized");
  }

  if (complaint.status !== "pending") {
    throw createHttpError(
      400,
      "Cannot update complaint after it has been assigned",
    );
  }
};

/** `store` is the single source of truth for location, so it is mandatory. */
const resolveStore = async (storeId) => {
  if (!storeId) throw createHttpError(400, "A store must be selected");

  const store = await storeData.findByIdName(storeId);
  if (!store) throw createHttpError(400, "Invalid store selected");

  return store;
};

const buildListFilter = async ({
  status,
  priority,
  storeId,
  store,
  search,
  month,
}) => {
  const filter = {};

  // `month` is a "YYYY-MM" tag; anything else is ignored rather than throwing,
  // so a stale query string cannot break the list.
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month ?? ""))) {
    const [year, monthIndex] = month.split("-").map(Number);
    filter.createdAt = {
      $gte: new Date(year, monthIndex - 1, 1),
      $lt: new Date(year, monthIndex, 1),
    };
  }

  if (status && status !== "all") {
    filter.status = status === "unresolved" ? { $ne: "resolved" } : status;
  }

  if (priority && priority !== "all") filter.priority = priority;

  // Accepts a store id directly, or a store name (the old location filter).
  const storeFilter = storeId || store;
  if (storeFilter && storeFilter !== "all") {
    filter.store = isValidId(storeFilter)
      ? storeFilter
      : { $in: await storeData.findIdsByExactName(storeFilter) };
  }

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(escapeRegex(term), "i");

    const [creatorIds, storeIds] = await Promise.all([
      userData.findIdsByNameMatch(regex),
      storeData.findIdsByPartialName(term),
    ]);

    filter.$or = [
      { title: regex },
      { description: regex },
      { complaintId: regex },
      { createdBy: { $in: creatorIds } },
      { store: { $in: storeIds } },
    ];
  }

  return filter;
};

const uploadPhotos = async (files) => {
  if (!files?.length) return [];

  const uploaded = [];
  try {
    return await Promise.all(files.map((file) => uploadToCloudinary(file)));
  } catch (error) {
    console.error("Photo upload error:", error);
    for (const photo of uploaded) {
      if (photo?.publicId) await deleteFromCloudinary(photo.publicId);
    }
    throw createHttpError(400, "Failed to upload photos");
  }
};

const applyPhotoChanges = async (complaint, { removedPhotos, files }) => {
  if (removedPhotos?.length) {
    const ids = Array.isArray(removedPhotos) ? removedPhotos : [removedPhotos];
    for (const publicId of ids) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.error("Error deleting photo from Cloudinary:", error);
      }
    }
    complaint.photos = complaint.photos.filter((p) => !ids.includes(p.publicId));
  }

  if (files?.length) {
    if (complaint.photos.length + files.length > MAX_PHOTOS) {
      throw createHttpError(
        400,
        `Maximum ${MAX_PHOTOS} photos allowed per complaint`,
      );
    }
    complaint.photos.push(...(await uploadPhotos(files)));
  }
};

const autoAssignIfEnabled = async (complaint, { userId, role }) => {
  if (!(await getComplaintAutoAssignEnabled())) return;

  await autoAssignComplaintToDefaultTechnician({
    complaint,
    ...(role === "admin" ? { assignedBy: userId } : {}),
  });
};

/** Parse + validate the materials payload against the inventory catalogue. */
const validateMaterials = async (rawMaterialsJson) => {
  let rawMaterials = [];
  try {
    rawMaterials = JSON.parse(rawMaterialsJson || "[]");
  } catch {
    rawMaterials = [];
  }
  if (!Array.isArray(rawMaterials)) rawMaterials = [];

  const rows = rawMaterials.filter((m) => m?.item && m?.quantity);
  if (rows.length === 0) {
    throw createHttpError(400, "Please select at least one material");
  }

  const validated = [];
  for (const row of rows) {
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw createHttpError(400, "Each material must have a valid quantity");
    }

    const catalogItem = await inventoryData.findById(row.item);
    if (!catalogItem) {
      throw createHttpError(
        400,
        "One of the selected materials is no longer available",
      );
    }

    validated.push({ item: catalogItem._id, quantity });
  }

  return validated;
};

const uploadResolutionMedia = async (files) => {
  const stamp = (result) => ({
    url: result.url,
    publicId: result.publicId,
    originalName: result.originalName,
    uploadedAt: new Date(),
  });

  const photoFiles = files?.resolutionPhotos ?? [];
  const videoFiles = files?.resolutionVideos ?? [];

  let photos = [];
  let videos = [];

  if (photoFiles.length) {
    try {
      photos = (await Promise.all(photoFiles.map(uploadToCloudinary))).map(stamp);
    } catch (error) {
      console.error("Resolution photo upload error:", error);
      throw createHttpError(400, "Failed to upload resolution photos");
    }
  }

  if (videoFiles.length) {
    try {
      videos = (await Promise.all(videoFiles.map(uploadVideoToCloudinary))).map(
        stamp,
      );
    } catch (error) {
      console.error("Resolution video upload error:", error);
      for (const photo of photos) await deleteFromCloudinary(photo.publicId);
      throw createHttpError(400, "Failed to upload resolution videos");
    }
  }

  return { photos, videos };
};

/**
 * Verify the technician is physically at the store, and record where they were.
 *
 * Runs before any Cloudinary upload so a rejected request never burns one.
 * The snapshot is written in every mode — including "warn", which blocks
 * nothing — because those recorded distances are what tell an admin whether a
 * store's radius is right before they switch the mode to "enforce".
 *
 * Mutates `complaint`; throws only in "enforce" mode.
 */
const applyGeofenceCheck = async ({
  complaint,
  technicianId,
  status,
  body,
  context,
}) => {
  const mode = await getComplaintGeofenceMode();
  if (mode === "off") return;

  const [store, lastKnownLocation] = await Promise.all([
    storeData.findById(complaint.store?._id ?? complaint.store),
    userData.findLastKnownLocation(technicianId),
  ]);

  const result = evaluateGeofence({
    store,
    body,
    lastKnownLocation,
    context: { ...context, mode },
  });

  // Store has no pin yet, so there is nothing to check — never block.
  if (!result.applicable) return;

  const isResolve = status === "resolved";
  const field = isResolve ? "resolveLocation" : "startLocation";
  complaint[field] = result.snapshot;
  if (!result.ok) complaint.geofenceFlagged = true;

  // Only a real fix is worth remembering for the next speed check.
  if (result.snapshot?.lat != null) {
    await userData.setLastKnownLocation({
      id: technicianId,
      lat: result.snapshot.lat,
      lng: result.snapshot.lng,
      capturedAt: result.snapshot.capturedAt,
    });
  }

  if (result.ok) return;

  const isBlocked = mode === "enforce";

  // Append the attempt now, in both modes. When blocked, the status update
  // never saves, so this is the only write that happens — and it also owns
  // persisting the reading itself.
  await complaintData.recordGeofenceFailure({
    id: complaint._id,
    action: isResolve ? "resolve" : "start",
    reading: result.snapshot,
    ...(isBlocked ? { field } : {}),
  });

  if (isBlocked) {
    throw createHttpError(403, geofenceFailureMessage(result, store.name));
  }
};

/** Fire-and-forget notifications; a delivery failure never fails the request. */
const notifyStatusChange = async (complaint, status) => {
  const storeName = complaint.store?.name || "";
  const issueTitle = complaint.title || "";

  // Never notify a technician about their own work — matches prior behaviour.
  const notifyCreator = complaint.creatorType !== "technician";
  const recipientPhone = notifyCreator ? complaint.createdBy?.phoneNumber : null;
  const recipientName = notifyCreator ? complaint.createdBy?.name : null;

  // phone -> name. One message per number; when a number appears in several
  // lists, the first (most specific) entry decides the greeting name.
  const recipients = new Map();
  const addRecipient = (rawPhone, name) => {
    const phone = normalizeIndianPhone10Digits(rawPhone);
    if (!phone) {
      console.warn(`Skipping contact "${name}" — unparseable phone`);
      return;
    }
    if (!recipients.has(phone)) recipients.set(phone, name);
  };

  if (status === "resolved") {
    // A store's opted-in contacts hear only about their own store.
    for (const m of complaint.store?.managers || []) {
      if (m.notifyOnResolve) addRecipient(m.phoneNumber, m.name);
    }
    // Global contacts hear about every store. A settings read failure must not
    // cost the store contacts or the creator their message.
    try {
      for (const contact of await getResolvedNotifyContacts()) {
        addRecipient(contact.phone, contact.name || recipientName);
      }
    } catch (error) {
      console.error("Failed to load resolved notify contacts:", error);
    }
  }

  // Deliberately silent to the creator when work merely starts.
  if (recipientPhone && status !== "in-progress") {
    addRecipient(recipientPhone, recipientName);
  }

  for (const [phone, name] of recipients) {
    try {
      const result = await sendStatusUpdateNotification(
        phone,
        complaint.complaintId,
        status,
        name,
        storeName,
        issueTitle,
      );
      if (!result.success) {
        console.error(`Failed to send status update to ${phone}:`, result.error);
      }
    } catch (error) {
      console.error("Notification sending error:", error);
    }
  }
};

export const complaintService = {
  list: async ({ user, query }) => {
    const { page = 1, limit = 10 } = query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = await buildListFilter(query);
    const { complaints, total } = await complaintData.listForUser({
      user,
      filter,
      page: safePage,
      limit: safeLimit,
    });

    return {
      complaints,
      pagination: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
        limit: safeLimit,
      },
    };
  },

  getById: async ({ id, user }) => {
    const complaint = await complaintData.findByIdForUser({ id, user });
    if (!complaint) throw createHttpError(404, "Complaint not found");
    return complaint;
  },

  create: async ({ user, body, files }) => {
    const { title, description, priority, storeId } = body;

    if (!title || !description) {
      throw createHttpError(400, "Title and description are required");
    }

    const store = await resolveStore(storeId);
    const complaintId = await generateNextComplaintId({
      storeName: store.name,
    });

    const complaint = await complaintData.create({
      complaintId,
      title,
      description,
      store: store._id,
      priority: priority || "medium",
      photos: await uploadPhotos(files),
      createdBy: user.id,
      creatorType: user.role,
    });

    await autoAssignIfEnabled(complaint, { userId: user.id, role: user.role });
    await complaintData.populate(complaint);

    return complaint;
  },

  update: async ({ id, user, body, files }) => {
    const { title, description, priority, storeId, removedPhotos } = body;

    const complaint = await complaintData.findById(id);
    if (!complaint) throw createHttpError(404, "Complaint not found");

    assertCanMutate(complaint, user);

    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (priority) complaint.priority = priority;
    if (storeId) complaint.store = (await resolveStore(storeId))._id;

    await applyPhotoChanges(complaint, { removedPhotos, files });

    return complaintData.save(complaint);
  },

  remove: async ({ id, user }) => {
    const complaint = await complaintData.findById(id);
    if (!complaint) throw createHttpError(404, "Complaint not found");

    assertCanMutate(complaint, user);

    // Clean up every Cloudinary asset, not just the original photos.
    const assets = [
      ...(complaint.photos ?? []),
      ...(complaint.resolutionPhotos ?? []),
      ...(complaint.resolutionVideos ?? []),
    ];
    for (const asset of assets) {
      if (asset?.publicId) {
        await deleteFromCloudinary(asset.publicId).catch(() => {});
      }
    }

    await complaintData.deleteById(id);
  },

  duplicate: async ({ id, user, body }) => {
    const { title, description, priority, storeId } = body;

    // You may only duplicate something you are allowed to see.
    const source = await complaintData.findByIdForUser({ id, user });
    if (!source) throw createHttpError(404, "Complaint not found");

    // Keep the source store unless the caller picks a different one.
    const store = storeId
      ? await resolveStore(storeId)
      : await storeData.findByIdName(source.store?._id ?? source.store);

    const complaint = await complaintData.create({
      complaintId: await generateNextComplaintId({ storeName: store?.name }),
      title: title || source.title,
      description: description || source.description,
      store: store?._id ?? null,
      priority: priority || source.priority,
      createdBy: user.id,
      creatorType: user.role,
    });

    await autoAssignIfEnabled(complaint, { userId: user.id, role: user.role });
    await complaintData.populate(complaint);

    return complaint;
  },

  createBulk: async ({ user, complaints }) => {
    if (!Array.isArray(complaints) || complaints.length === 0) {
      throw createHttpError(400, "complaints must be a non-empty array");
    }

    const results = [];

    for (let i = 0; i < complaints.length; i++) {
      const { title, description, priority, storeId } = complaints[i];

      if (!title?.trim() || !description?.trim()) {
        results.push({
          index: i,
          success: false,
          error: "Title and description are required",
        });
        continue;
      }

      try {
        const store = await resolveStore(storeId);

        const complaint = await complaintData.create({
          complaintId: await generateNextComplaintId({
            storeName: store.name,
          }),
          title: title.trim(),
          description: description.trim(),
          store: store._id,
          priority: priority || "medium",
          createdBy: user.id,
          creatorType: user.role,
        });

        await autoAssignIfEnabled(complaint, {
          userId: user.id,
          role: user.role,
        });
        await complaintData.populate(complaint);

        results.push({ index: i, success: true, complaint });
      } catch (error) {
        console.error(`Bulk complaint [${i}] error:`, error);
        results.push({
          index: i,
          success: false,
          error: error.statusCode ? error.message : "Failed to create complaint",
        });
      }
    }

    const created = results.filter((r) => r.success).length;

    return {
      summary: {
        total: complaints.length,
        created,
        failed: complaints.length - created,
      },
      results,
    };
  },

  listAssigned: async (technicianId) => {
    const complaints = await complaintData.listAssignedToTechnician({
      technicianId,
      status: { $in: ["assigned", "in-progress"] },
      sort: { assignedAt: -1 },
    });

    const completed = await complaintData.countAssignedToTechnician({
      technicianId,
      status: "resolved",
    });

    return {
      complaints,
      stats: {
        total: complaints.length + completed,
        assigned: complaints.filter((c) => c.status === "assigned").length,
        inProgress: complaints.filter((c) => c.status === "in-progress").length,
        completed,
      },
    };
  },

  /** Admin review queue: status updates that failed their geofence check. */
  listGeofenceFlagged: ({ limit } = {}) =>
    complaintData.listGeofenceFlagged({
      limit: Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200),
    }),

  listResolvedAssignments: (technicianId) =>
    complaintData.listAssignedToTechnician({
      technicianId,
      status: "resolved",
      sort: { completedAt: -1, updatedAt: -1 },
    }),

  updateStatus: async ({ id, technicianId, body, files, context = {} }) => {
    const { status, notes, resolutionNotes, idempotencyKey } = body;

    if (!status) throw createHttpError(400, "Status is required");
    if (!VALID_STATUSES.includes(status)) {
      throw createHttpError(
        400,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }

    const complaint = await complaintData.findAssignedToTechnician({
      id,
      technicianId,
    });
    if (!complaint) {
      throw createHttpError(404, "Complaint not found or not assigned to you");
    }

    /**
     * A retry — or the offline queue replaying after connectivity returns —
     * carries the key of the update it already sent. Return the complaint
     * unchanged rather than re-uploading media, or failing the (now invalid)
     * transition out of the status this very request already applied.
     */
    if (idempotencyKey && complaint.statusUpdateKeys?.includes(idempotencyKey)) {
      return complaint;
    }

    if (!VALID_TRANSITIONS[complaint.status]?.includes(status)) {
      throw createHttpError(
        400,
        `Cannot change status from ${complaint.status} to ${status}`,
      );
    }

    await applyGeofenceCheck({
      complaint,
      technicianId,
      status,
      body,
      context,
    });

    if (status === "resolved") {
      const attendanceToday = await attendanceService.getToday(technicianId);
      if (!attendanceToday) {
        throw createHttpError(
          400,
          "Please mark your attendance before resolving this complaint",
        );
      }

      if (!resolutionNotes || resolutionNotes.trim() === "") {
        throw createHttpError(
          400,
          "Resolution notes are required when marking complaint as resolved",
        );
      }

      const materialsUsed = ["true", true, "1"].includes(body.materialsUsed);
      const materials = materialsUsed
        ? await validateMaterials(body.materials)
        : [];

      const media = await uploadResolutionMedia(files);

      complaint.completedAt = new Date();
      complaint.resolvedAt = new Date();
      complaint.resolutionNotes = resolutionNotes;
      complaint.materialsUsed = materialsUsed;
      complaint.materials = materials;
      if (media.photos.length) complaint.resolutionPhotos = media.photos;
      if (media.videos.length) complaint.resolutionVideos = media.videos;
    } else if (status === "in-progress") {
      complaint.startedAt = new Date();
    }

    complaint.status = status;
    if (notes) complaint.technicianNotes = notes;
    if (idempotencyKey) complaint.statusUpdateKeys.push(idempotencyKey);

    await complaintData.save(complaint);
    await notifyStatusChange(complaint, status);

    return complaint;
  },
};
