import Complaint from "../models/Complaint.js";
import Client from "../models/Client.js";
import Notification from "../models/Notification.js";
import Store from "../models/Store.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import {
  sendStatusUpdateNotification,
  sendAssignmentNotification,
} from "../config/msg91.js";
import { generateNextComplaintId } from "../utils/complaintId.js";

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
          req.files.map((file) => uploadToCloudinary(file))
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

    // Populate client info for response
    await complaint.populate("client", "name phoneNumber");
    await complaint.populate("store", "name managers");

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
        (photo) => !removedPhotoIds.includes(photo.publicId)
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
          req.files.map((file) => uploadToCloudinary(file))
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
          .filter(Boolean)
      ),
    ];

    const stores = missingStoreNames.length
      ? await Store.find({
          name: { $in: missingStoreNames },
          isActive: true,
        }).select("name managers")
      : [];

    const storeByLowerName = new Map(
      stores.map((s) => [String(s.name).toLowerCase(), s])
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
      .populate("createdByAdmin", "name")
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
        `${complaint.status} -> ${status}`
      );
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${complaint.status} to ${status}`,
      });
    }

    // Handle resolution photos if complaint is being resolved
    let resolutionPhotos = [];
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

      if (req.files && req.files.length > 0) {
        console.log("📸 Processing resolution photos:", req.files.length);
        try {
          const uploadResults = await Promise.all(
            req.files.map((file) => uploadToCloudinary(file))
          );
          resolutionPhotos = uploadResults.map((result) => ({
            url: result.url,
            publicId: result.publicId,
            originalName: result.originalName,
            uploadedAt: new Date(),
          }));
        } catch (error) {
          console.error("Resolution photo upload error:", error);
          // Clean up any uploaded photos if one fails
          for (const photo of resolutionPhotos) {
            await deleteFromCloudinary(photo.publicId);
          }
          return res.status(400).json({
            success: false,
            message: "Failed to upload resolution photos",
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
    }

    await complaint.save();

    // Re-populate after save to ensure we have all data
    await complaint.populate("client", "name phoneNumber");
    await complaint.populate("createdByTechnician", "name phoneNumber");
    await complaint.populate("assignedTechnician", "name phoneNumber");

    // Send notification using MSG91 - Fixed client data access
    const recipientPhone =
      complaint.client?.phoneNumber ||
      complaint.createdByTechnician?.phoneNumber;
    const recipientName =
      complaint.client?.name || complaint.createdByTechnician?.name;

    console.log("📱 Notification Debug Info:");
    console.log("  - Complaint ID:", complaint.complaintId);
    console.log("  - Status:", status);
    console.log("  - Recipient Phone:", recipientPhone);
    console.log("  - Recipient Name:", recipientName);
    console.log("  - Client Data:", complaint.client);
    console.log("  - Technician Data:", complaint.createdByTechnician);

    if (recipientPhone) {
      try {
        const notificationResult = await sendStatusUpdateNotification(
          recipientPhone,
          complaint.complaintId,
          status,
          recipientName,
          complaint.assignedTechnician.name
        );

        // Save notification record
        const notification = new Notification({
          complaint: complaint._id,
          recipient: recipientPhone,
          type: "status_update",
          message: `Complaint ${complaint.complaintId} status changed to ${status}`,
          status: notificationResult.success ? "sent" : "failed",
          twilioMessageId: notificationResult.messageId,
          error: notificationResult.success ? null : notificationResult.error,
          sentAt: notificationResult.success ? new Date() : null,
        });

        await notification.save();
      } catch (notificationError) {
        console.error("❌ Notification sending error:", notificationError);

        // Save failed notification record
        const notification = new Notification({
          complaint: complaint._id,
          recipient: recipientPhone,
          type: "status_update",
          message: `Complaint ${complaint.complaintId} status changed to ${status}`,
          status: "failed",
          error: notificationError.message,
        });

        await notification.save();
      }
    } else {
      console.log(
        "⚠️ Skipping notification - recipient phone number not found"
      );
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
    console.error("Update complaint status error:", error);
    console.error("Error stack:", error.stack);
    console.error("❌ ===== ERROR END =====");

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
          .filter(Boolean)
      ),
    ];

    const stores = missingStoreNames.length
      ? await Store.find({
          name: { $in: missingStoreNames },
          isActive: true,
        }).select("name managers")
      : [];

    const storeByLowerName = new Map(
      stores.map((s) => [String(s.name).toLowerCase(), s])
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
