import Complaint from "../models/Complaint.js";
import Client from "../models/Client.js";
import Notification from "../models/Notification.js";
import Store from "../models/Store.js";
import {
  uploadToCloudinary,
  uploadVideoToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { sendStatusUpdateNotification } from "../config/msg91.js";
import { generateNextComplaintId } from "../utils/complaintId.js";
import { autoAssignComplaintToDefaultTechnician } from "../utils/autoAssign.js";
import { getComplaintAutoAssignEnabled } from "../utils/complaintAutoAssignSetting.js";
import { getResolvedNotifyContacts } from "../utils/resolvedNotifyContactSetting.js";

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

export const createComplaint = async (req, res) => {
  try {
    const { title, description, location, priority, storeId } = req.body;
    const clientId = req.user.id;

    if (!title || !description || (!location && !storeId)) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and location are required",
      });
    }

    let resolvedLocation = location;
    let resolvedStoreId = null;
    let resolvedStoreName = null;
    if (storeId) {
      const store = await Store.findById(storeId).select("name");
      if (!store) {
        return res.status(400).json({
          success: false,
          message: "Invalid store selected",
        });
      }
      resolvedStoreId = store._id;
      resolvedStoreName = store.name;
      resolvedLocation = store.name;
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const complaintId = await generateNextComplaintId({
      storeName: resolvedStoreName || resolvedLocation,
    });

    // Handle photo uploads - parallel for speed
    let photos = [];
    if (req.files && req.files.length > 0) {
      try {
        photos = await Promise.all(
          req.files.map((file) => uploadToCloudinary(file)),
        );
      } catch (error) {
        console.error("Photo upload error:", error);
        // Clean up any uploaded photos if one fails
        for (const photo of photos) {
          if (photo?.publicId) {
            await deleteFromCloudinary(photo.publicId);
          }
        }
        return res.status(400).json({
          success: false,
          message: "Failed to upload photos",
        });
      }
    }

    const complaint = new Complaint({
      complaintId,
      title,
      description,
      location: resolvedLocation,
      store: resolvedStoreId,
      priority: priority || "medium",
      photos,
      client: clientId,
      creatorType: "client",
    });

    await complaint.save();

    const shouldAutoAssign = await getComplaintAutoAssignEnabled();
    if (shouldAutoAssign) {
      await autoAssignComplaintToDefaultTechnician({ complaint });
    }

    // Populate client info for response
    await complaint.populate("client", "name phoneNumber");
    await complaint.populate("store", "name managers");
    await complaint.populate("assignedTechnician", "name phoneNumber");

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { client: userId };
    if (status) {
      filter.status = status;
    }

    const complaints = await Complaint.find(filter)
      .populate("assignedTechnician", "name phoneNumber")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name")
      .populate("store", "name managers")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get my complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, priority, removedPhotos } = req.body;
    const userId = req.user.id;

    const complaint = await Complaint.findOne({ _id: id, client: userId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or unauthorized",
      });
    }

    // Only allow updates if complaint is still pending
    if (complaint.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update complaint after it has been assigned",
      });
    }

    // Update basic fields
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (location) complaint.location = location;
    if (priority) complaint.priority = priority;

    // Handle photo removals
    if (removedPhotos && removedPhotos.length > 0) {
      const removedPhotoIds = Array.isArray(removedPhotos)
        ? removedPhotos
        : [removedPhotos];

      // Remove photos from Cloudinary
      for (const publicId of removedPhotoIds) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (error) {
          console.error("Error deleting photo from Cloudinary:", error);
        }
      }

      // Remove photos from complaint
      complaint.photos = complaint.photos.filter(
        (photo) => !removedPhotoIds.includes(photo.publicId),
      );
    }

    // Handle new photo uploads - parallel for speed
    if (req.files && req.files.length > 0) {
      // Check if adding new photos would exceed the limit
      if (complaint.photos.length + req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum 5 photos allowed per complaint",
        });
      }

      try {
        const newPhotos = await Promise.all(
          req.files.map((file) => uploadToCloudinary(file)),
        );
        complaint.photos.push(...newPhotos);
      } catch (error) {
        console.error("Photo upload error:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to upload new photos",
        });
      }
    }

    await complaint.save();

    // Populate the complaint before sending response
    await complaint.populate("client", "name phoneNumber");

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const complaint = await Complaint.findOne({ _id: id, client: userId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or unauthorized",
      });
    }

    // Only allow deletion if complaint is still pending
    if (complaint.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete complaint after it has been assigned",
      });
    }

    // Delete photos from Cloudinary
    for (const photo of complaint.photos) {
      await deleteFromCloudinary(photo.publicId);
    }

    await Complaint.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    console.error("Delete complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createBulkComplaints = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { complaints } = req.body;

    if (!Array.isArray(complaints) || complaints.length === 0) {
      return res.status(400).json({
        success: false,
        message: "complaints must be a non-empty array",
      });
    }

    const shouldAutoAssign = await getComplaintAutoAssignEnabled();
    const results = [];

    for (let i = 0; i < complaints.length; i++) {
      const entry = complaints[i];
      const { title, description, location, priority } = entry;

      if (!title?.trim() || !description?.trim() || !location?.trim()) {
        results.push({ index: i, success: false, error: "Title, description, and location are required" });
        continue;
      }

      try {
        const complaintId = await generateNextComplaintId({ storeName: location.trim() });

        const creatorFields =
          role === "client"
            ? { client: userId, creatorType: "client" }
            : role === "admin"
            ? { createdByAdmin: userId, creatorType: "admin" }
            : { createdByTechnician: userId, creatorType: "technician" };

        const complaint = new Complaint({
          complaintId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          priority: priority || "medium",
          ...creatorFields,
        });

        await complaint.save();

        if (shouldAutoAssign) {
          const assignOpts = role === "admin"
            ? { complaint, assignedBy: userId }
            : { complaint };
          await autoAssignComplaintToDefaultTechnician(assignOpts);
        }

        await complaint.populate("assignedTechnician", "name phoneNumber");

        results.push({ index: i, success: true, complaint });
      } catch (entryError) {
        console.error(`Bulk complaint [${i}] error:`, entryError);
        results.push({ index: i, success: false, error: "Failed to create complaint" });
      }
    }

    const created = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.status(201).json({
      success: true,
      summary: { total: complaints.length, created, failed },
      results,
    });
  } catch (error) {
    console.error("Create bulk complaints error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Technician-specific controllers
export const getAssignedComplaints = async (req, res) => {
  try {
    const technicianId = req.user.id;

    // Find complaints assigned to this technician
    const complaints = await Complaint.find({
      assignedTechnician: technicianId,
      status: { $in: ["assigned", "in-progress"] }, // Only active assignments
    })
      .populate("client", "name phoneNumber")
      .populate("assignedBy", "name")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name")
      .populate("store", "name managers")
      .sort({ assignedAt: -1 });

    // Backfill store contacts for older complaints (store missing, location contains store name)
    const missingStoreNames = [
      ...new Set(
        complaints
          .filter((c) => !c.store && c.location)
          .map((c) => String(c.location).trim())
          .filter(Boolean),
      ),
    ];

    const stores = missingStoreNames.length
      ? await Store.find({
          name: { $in: missingStoreNames },
          isActive: true,
        }).select("name managers")
      : [];

    const storeByLowerName = new Map(
      stores.map((s) => [String(s.name).toLowerCase(), s]),
    );

    const complaintsWithStore = complaints.map((c) => {
      const obj = c.toObject();
      if (!obj.store && obj.location) {
        obj.store =
          storeByLowerName.get(String(obj.location).toLowerCase()) || null;
      }
      return obj;
    });

    // Calculate stats
    const stats = {
      total: complaints.length,
      assigned: complaints.filter((c) => c.status === "assigned").length,
      inProgress: complaints.filter((c) => c.status === "in-progress").length,
      completed: 0, // Will be calculated separately if needed
    };

    // Get completed count for stats
    const completedCount = await Complaint.countDocuments({
      assignedTechnician: technicianId,
      status: "resolved",
    });
    stats.completed = completedCount;
    stats.total = complaints.length + completedCount;

    res.status(200).json({
      success: true,
      data: {
        complaints: complaintsWithStore,
        stats,
      },
    });
  } catch (error) {
    console.error("Get assigned complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const technicianId = req.user.id;

    // Extract status from body (FormData sends it as string)
    const { status, notes, resolutionNotes } = req.body;

    if (!status) {
      console.log("❌ Status is missing from request body");
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Validate status value
    const validStatuses = ["assigned", "in-progress", "resolved"];
    if (!validStatuses.includes(status)) {
      console.log("❌ Invalid status value:", status);
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Find complaint assigned to this technician with client info
    const complaint = await Complaint.findOne({
      _id: id,
      assignedTechnician: technicianId,
    })
      .populate("client", "name phoneNumber")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name phoneNumber")
      .populate("store", "name managers");

    if (!complaint) {
      console.log("❌ Complaint not found or not assigned to technician");
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not assigned to you",
      });
    }

    // Validate status transition
    const validTransitions = {
      assigned: ["in-progress"],
      "in-progress": ["resolved"],
    };

    if (!validTransitions[complaint.status]?.includes(status)) {
      console.log(
        "❌ Invalid status transition:",
        `${complaint.status} -> ${status}`,
      );
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${complaint.status} to ${status}`,
      });
    }

    // Handle resolution photos + videos if complaint is being resolved
    let resolutionPhotos = [];
    let resolutionVideos = [];
    if (status === "resolved") {
      // Validate resolution notes are required for resolved status
      if (!resolutionNotes || resolutionNotes.trim() === "") {
        console.log("❌ Resolution notes are required for resolved status");
        return res.status(400).json({
          success: false,
          message:
            "Resolution notes are required when marking complaint as resolved",
        });
      }

      // Validate materials used is required for resolved status
      const materialsUsed = req.body.materialsUsed;
      if (!materialsUsed || materialsUsed.trim() === "") {
        console.log("❌ Materials used is required for resolved status");
        return res.status(400).json({
          success: false,
          message:
            "Materials used is required when marking complaint as resolved",
        });
      }

      // req.files is now an object keyed by field name (from .fields())
      const photoFiles = req.files?.resolutionPhotos || [];
      const videoFiles = req.files?.resolutionVideos || [];

      // Upload photos
      if (photoFiles.length > 0) {
        try {
          const uploadResults = await Promise.all(
            photoFiles.map((file) => uploadToCloudinary(file)),
          );
          resolutionPhotos = uploadResults.map((result) => ({
            url: result.url,
            publicId: result.publicId,
            originalName: result.originalName,
            uploadedAt: new Date(),
          }));
        } catch (error) {
          console.error("Resolution photo upload error:", error);
          for (const photo of resolutionPhotos) {
            await deleteFromCloudinary(photo.publicId);
          }
          return res.status(400).json({
            success: false,
            message: "Failed to upload resolution photos",
          });
        }
      }

      // Upload videos
      if (videoFiles.length > 0) {
        try {
          const uploadResults = await Promise.all(
            videoFiles.map((file) => uploadVideoToCloudinary(file)),
          );
          resolutionVideos = uploadResults.map((result) => ({
            url: result.url,
            publicId: result.publicId,
            originalName: result.originalName,
            uploadedAt: new Date(),
          }));
        } catch (error) {
          console.error("Resolution video upload error:", error);
          for (const video of resolutionVideos) {
            await deleteFromCloudinary(video.publicId);
          }
          return res.status(400).json({
            success: false,
            message: "Failed to upload resolution videos",
          });
        }
      }
    }

    // Update complaint
    const oldStatus = complaint.status;
    complaint.status = status;
    if (notes) {
      complaint.technicianNotes = notes;
    }

    if (status === "in-progress") {
      complaint.startedAt = new Date();
    } else if (status === "resolved") {
      complaint.completedAt = new Date();
      complaint.resolvedAt = new Date();
      if (resolutionNotes) {
        complaint.resolutionNotes = resolutionNotes;
      }
      if (req.body.materialsUsed) {
        complaint.materialsUsed = req.body.materialsUsed;
      }
      if (resolutionPhotos.length > 0) {
        complaint.resolutionPhotos = resolutionPhotos;
      }
      if (resolutionVideos.length > 0) {
        complaint.resolutionVideos = resolutionVideos;
      }
    }

    await complaint.save();

    // Re-populate after save to ensure we have all data
    await complaint.populate("client", "name phoneNumber");
    await complaint.populate("createdByTechnician", "name phoneNumber");
    await complaint.populate("createdByAdmin", "name phoneNumber");
    await complaint.populate("assignedTechnician", "name phoneNumber");

    let recipientPhone;
    let recipientName;

    if (complaint.creatorType === "client") {
      recipientPhone = complaint.client?.phoneNumber;
      recipientName = complaint.client?.name;
    } else if (complaint.creatorType === "admin") {
      recipientPhone = complaint.createdByAdmin?.phoneNumber;
      recipientName = complaint.createdByAdmin?.name;
    }

    const templateLocation = complaint.location || "";
    const templateIssueTitle = complaint.title || "";

    // Notify the complaint creator (client or admin who raised it)
    if (recipientPhone) {
      try {
        // Disabled per request: do not notify client when work starts (in-progress)
        const notificationResult =
          status === "in-progress"
            ? { success: true, skipped: true }
            : await sendStatusUpdateNotification(
                recipientPhone,
                complaint.complaintId,
                status,
                recipientName,
                templateLocation,
                templateIssueTitle,
              );

        await new Notification({
          complaint: complaint._id,
          recipient: recipientPhone,
          type: "status_update",
          message: `Complaint ${complaint.complaintId} status changed to ${status}`,
          status: notificationResult.success ? "sent" : "failed",
          twilioMessageId: notificationResult.messageId,
          error: notificationResult.success ? null : notificationResult.error,
          sentAt: notificationResult.success ? new Date() : null,
        }).save();
      } catch (notificationError) {
        console.error("❌ Notification sending error:", notificationError);
        await new Notification({
          complaint: complaint._id,
          recipient: recipientPhone,
          type: "status_update",
          message: `Complaint ${complaint.complaintId} status changed to ${status}`,
          status: "failed",
          error: notificationError.message,
        }).save();
      }
    } else {
      console.log(
        "⚠️ Skipping creator notification - phone missing",
      );
    }

    // Always notify all configured resolved-notify contacts on resolution
    if (status === "resolved") {
      const resolvedContacts = await getResolvedNotifyContacts();

      console.log(`🔔 Resolution notify: complaint="${complaint.complaintId}" total_contacts=${resolvedContacts.length}`);
      resolvedContacts.forEach((c, i) => {
        console.log(`  contact[${i}] name="${c.name || "(none)"}" phone="${c.phone}"`);
      });

      for (const contact of resolvedContacts) {
        const contactPhone10 = normalizeIndianPhone10Digits(contact.phone);
        if (!contactPhone10) {
          console.warn(`⚠️ Skipping contact "${contact.name}" — phone "${contact.phone}" could not be normalized`);
          continue;
        }

        console.log(`📲 Sending resolved notification → contact="${contact.name}" normalized="${contactPhone10}"`);

        try {
          const contactResult = await sendStatusUpdateNotification(
            contactPhone10,
            complaint.complaintId,
            status,
            contact.name || recipientName,
            templateLocation,
            templateIssueTitle,
          );

          console.log(`  → result for "${contact.name}" (${contactPhone10}): success=${contactResult.success} messageId="${contactResult.messageId || "-"}" error="${contactResult.error || "-"}"`);

          await new Notification({
            complaint: complaint._id,
            recipient: `+91${contactPhone10}`,
            type: "status_update",
            message: `Complaint ${complaint.complaintId} status changed to ${status}${
              contact.name ? ` (notify: ${contact.name})` : ""
            }`,
            status: contactResult.success ? "sent" : "failed",
            twilioMessageId: contactResult.messageId,
            error: contactResult.success ? null : contactResult.error,
            sentAt: contactResult.success ? new Date() : null,
          }).save();
        } catch (contactError) {
          console.error("❌ Resolved contact notification error:", contactError);
          await new Notification({
            complaint: complaint._id,
            recipient: contact.phone || "(missing)",
            type: "status_update",
            message: `Complaint ${complaint.complaintId} status changed to ${status}${
              contact.name ? ` (notify: ${contact.name})` : ""
            }`,
            status: "failed",
            error: contactError.message,
          }).save();
        }
      }
    }

    // Populate the response
    await complaint.populate("assignedTechnician", "name phoneNumber");

    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("❌ ===== COMPLAINT STATUS UPDATE ERROR =====");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = { _id: id };

    // Clients can only see their own complaints
    if (userRole === "client") {
      filter.client = userId;
    }
    // Technicians can only see assigned complaints
    else if (userRole === "technician") {
      filter.assignedTechnician = userId;
    }

    const complaint = await Complaint.findOne(filter)
      .populate("client", "name phoneNumber")
      .populate("assignedTechnician", "name phoneNumber")
      .populate("assignedBy", "name")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name")
      .populate("store", "name managers");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    console.error("Get complaint by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get resolved complaints for technician
export const getResolvedComplaints = async (req, res) => {
  try {
    const technicianId = req.user.id;

    // Find resolved complaints assigned to this technician
    const complaints = await Complaint.find({
      assignedTechnician: technicianId,
      status: "resolved",
    })
      .populate("client", "name phoneNumber")
      .populate("assignedBy", "name")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name")
      .populate("store", "name managers")
      .sort({ completedAt: -1, updatedAt: -1 });

    // Backfill store contacts for older complaints
    const missingStoreNames = [
      ...new Set(
        complaints
          .filter((c) => !c.store && c.location)
          .map((c) => String(c.location).trim())
          .filter(Boolean),
      ),
    ];

    const stores = missingStoreNames.length
      ? await Store.find({
          name: { $in: missingStoreNames },
          isActive: true,
        }).select("name managers")
      : [];

    const storeByLowerName = new Map(
      stores.map((s) => [String(s.name).toLowerCase(), s]),
    );

    const complaintsWithStore = complaints.map((c) => {
      const obj = c.toObject();
      if (!obj.store && obj.location) {
        obj.store =
          storeByLowerName.get(String(obj.location).toLowerCase()) || null;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      data: {
        complaints: complaintsWithStore,
      },
    });
  } catch (error) {
    console.error("Get resolved complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
