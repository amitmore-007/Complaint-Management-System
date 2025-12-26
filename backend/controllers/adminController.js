import jwt from "jsonwebtoken";
import Client from "../models/Client.js";
import Technician from "../models/Technician.js";
import Admin from "../models/Admin.js";
import Complaint from "../models/Complaint.js";
import Store from "../models/Store.js";
import Notification from "../models/Notification.js";
import OTP from "../models/OTP.js";
import {
  sendOTP,
  sendStatusUpdateNotification,
  sendAssignmentNotification,
} from "../config/msg91.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { generateNextComplaintId } from "../utils/complaintId.js";

// ============================================
// HELPER FUNCTIONS
// ============================================

// generate 6-digit otp
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// generate jwt token for admin (never expires)
const generateToken = (userId) => {
  return jwt.sign({ userId, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "999y",
  });
};

// normalize phone number (remove +91, keep only 10 digits)
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  let cleaned = phoneNumber.replace(/\D/g, "");

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.length === 10) {
    return cleaned;
  }

  return phoneNumber;
};

// ============================================
// AUTHENTICATION CONTROLLERS
// ============================================

// send otp to admin's whatsapp
export const sendAdminOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const otp = generateOTP();

    // delete any existing otp for this phone number
    await OTP.deleteMany({ phoneNumber, role: "admin" });

    // create new otp record
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      role: "admin",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await otpRecord.save();

    // send otp via whatsapp
    const result = await sendOTP(phoneNumber, otp);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to WhatsApp",
        messageId: result.messageId,
      });
    } else {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send Admin OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// verify otp and login admin
export const verifyAdminOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    // find valid otp
    const otpRecord = await OTP.findOne({
      phoneNumber,
      otp,
      role: "admin",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // mark otp as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // find or create admin
    let admin = await Admin.findOne({ phoneNumber });

    if (!admin) {
      const defaultName = name || `Admin-${phoneNumber.slice(-4)}`;
      admin = new Admin({
        phoneNumber,
        name: defaultName,
        isVerified: true,
      });
      await admin.save();
    } else {
      admin.isVerified = true;
      admin.lastLogin = new Date();
      if (name && name !== admin.name) {
        admin.name = name;
      }
      await admin.save();
    }

    // generate jwt token
    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: admin._id,
        phoneNumber: admin.phoneNumber,
        name: admin.name,
        role: "admin",
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Verify Admin OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// get current logged in admin
export const getCurrentAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: admin._id,
        phoneNumber: admin.phoneNumber,
        name: admin.name,
        role: "admin",
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get current admin error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// COMPLAINT MANAGEMENT CONTROLLERS
// ============================================

// create complaint by admin
export const createAdminComplaint = async (req, res) => {
  try {
    const { title, description, location, priority, storeId } = req.body;
    const adminId = req.user.id;

    if (!title || !description || (!location && !storeId)) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and location are required",
      });
    }

    // Verify admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Resolve store -> location
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

    const complaintId = await generateNextComplaintId({
      storeName: resolvedStoreName || resolvedLocation,
    });

    // Handle photo uploads - parallel for speed
    let photos = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadResults = await Promise.all(
          req.files.map((file) => uploadToCloudinary(file))
        );
        photos = uploadResults.map((result) => ({
          url: result.url,
          publicId: result.publicId,
        }));
      } catch (uploadError) {
        console.error("Photo upload error:", uploadError);
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
      createdByAdmin: adminId,
      creatorType: "admin",
    });

    await complaint.save();

    // Populate admin + store info for response
    await complaint.populate("createdByAdmin", "name phoneNumber");
    await complaint.populate("store", "name managers");

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create admin complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// get all complaints with filters
export const getAllComplaints = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate("client", "name phoneNumber")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name phoneNumber")
      .populate("assignedTechnician", "name phoneNumber")
      .populate("assignedBy", "name")
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
    console.error("Get all complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// assign complaint to technician
export const assignComplaint = async (req, res) => {
  try {
    const { complaintId, technicianId } = req.body;
    const adminId = req.user.id;

    if (!complaintId || !technicianId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID and Technician ID are required",
      });
    }

    // Find the complaint with client info
    const complaint = await Complaint.findById(complaintId).populate(
      "client",
      "name phoneNumber"
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Complaint is already assigned or completed",
      });
    }

    // Find the technician
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    if (!technician.isActive) {
      return res.status(400).json({
        success: false,
        message: "Technician is not active",
      });
    }

    // Update complaint
    complaint.assignedTechnician = technicianId;
    complaint.assignedBy = adminId;
    complaint.assignedAt = new Date();
    complaint.status = "assigned";

    await complaint.save();

    // Update technician stats
    await Technician.findByIdAndUpdate(technicianId, {
      $inc: { activeAssignments: 1 },
    });

    // Send WhatsApp notification to technician
    if (technician && technician.phoneNumber) {
      try {
        const notificationResult = await sendAssignmentNotification(
          technician.phoneNumber,
          complaint.complaintId
        );

        // Save notification record
        const notification = new Notification({
          complaint: complaint._id,
          recipient: technician.phoneNumber,
          type: "assignment",
          message: `Complaint ${complaint.complaintId} assigned to ${technician.name}`,
          status: notificationResult.success ? "sent" : "failed",
          messageId: notificationResult.messageId,
          error: notificationResult.success ? null : notificationResult.error,
          sentAt: notificationResult.success ? new Date() : null,
        });

        await notification.save();

        if (!notificationResult.success) {
          console.error(
            "❌ Failed to send assignment notification:",
            notificationResult.error
          );
        }
      } catch (notificationError) {
        console.error("❌ Assignment notification error:", notificationError);

        // Save failed notification record
        const notification = new Notification({
          complaint: complaint._id,
          recipient: technician.phoneNumber,
          type: "assignment",
          message: `Complaint ${complaint.complaintId} assigned to ${technician.name}`,
          status: "failed",
          error: notificationError.message,
        });

        await notification.save();
      }
    }

    // Populate response
    await complaint.populate([
      { path: "client", select: "name phoneNumber" },
      { path: "assignedTechnician", select: "name phoneNumber" },
      { path: "assignedBy", select: "name" },
    ]);

    res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
      complaint,
    });
  } catch (error) {
    console.error("Assign complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// auto-assign pending complaints to available technicians
export const autoAssignPendingComplaints = async () => {
  try {
    // Get all pending complaints
    const pendingComplaints = await Complaint.find({ status: "pending" })
      .populate("client", "phoneNumber")
      .sort({ createdAt: 1 }); // Oldest first

    if (pendingComplaints.length === 0) {
      return;
    }

    // Get active technicians
    const technicians = await Technician.find({
      isActive: true,
    }).sort({ _id: 1 });

    if (technicians.length === 0) {
      console.log("No active technicians available for auto-assignment");
      return;
    }

    // Get technician with least assignments (round-robin approach)
    const technicianAssignments = await Promise.all(
      technicians.map(async (tech) => {
        const count = await Complaint.countDocuments({
          assignedTechnician: tech._id,
          status: { $in: ["assigned", "in-progress"] },
        });
        return { technician: tech, assignmentCount: count };
      })
    );

    // Sort by assignment count (ascending)
    technicianAssignments.sort((a, b) => a.assignmentCount - b.assignmentCount);

    // Assign complaints in round-robin fashion
    for (let i = 0; i < pendingComplaints.length; i++) {
      const complaint = pendingComplaints[i];
      const techIndex = i % technicianAssignments.length;
      const selectedTech = technicianAssignments[techIndex].technician;

      complaint.assignedTechnician = selectedTech._id;
      complaint.assignedAt = new Date();
      complaint.status = "assigned";

      await complaint.save();

      // Send notification to technician
      if (selectedTech.phoneNumber) {
        await sendAssignmentNotification(
          selectedTech.phoneNumber,
          complaint.complaintId
        );
      }
    }
  } catch (error) {
    console.error("Auto-assign error:", error);
  }
};

// get single complaint by id
export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate("client", "name phoneNumber")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("createdByAdmin", "name phoneNumber")
      .populate("assignedTechnician", "name phoneNumber")
      .populate("assignedBy", "name")
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

// ============================================
// USER MANAGEMENT CONTROLLERS
// ============================================

// get all clients with pagination
export const getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(filter)
      .select("name phoneNumber isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Client.countDocuments(filter);

    // Get complaint counts for each client
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const complaintCount = await Complaint.countDocuments({
          client: client._id,
        });
        return {
          ...client.toObject(),
          complaintCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      clients: clientsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all clients error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// get all technicians with assignment stats
export const getAllTechnicians = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const technicians = await Technician.find(filter)
      .select("name phoneNumber isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Technician.countDocuments(filter);

    // Get assignment stats for each technician (allow multiple assignments)
    const techniciansWithStats = await Promise.all(
      technicians.map(async (tech) => {
        const activeAssignments = await Complaint.countDocuments({
          assignedTechnician: tech._id,
          status: { $in: ["assigned", "in-progress"] },
        });
        const completedAssignments = await Complaint.countDocuments({
          assignedTechnician: tech._id,
          status: "resolved",
        });
        const totalAssignments = await Complaint.countDocuments({
          assignedTechnician: tech._id,
        });
        return {
          ...tech.toObject(),
          activeAssignments,
          completedAssignments,
          totalAssignments,
        };
      })
    );

    res.status(200).json({
      success: true,
      technicians: techniciansWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all technicians error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// toggle user (client/technician) active status
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Try to find user in both Client and Technician models
    let user = await Client.findById(userId);
    let userType = "client";

    if (!user) {
      user = await Technician.findById(userId);
      userType = "technician";
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: userType,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// delete user (client/technician) if no active assignments
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to find user in both Client and Technician models
    let user = await Client.findById(userId);
    let userType = "client";
    let Model = Client;

    if (!user) {
      user = await Technician.findById(userId);
      userType = "technician";
      Model = Technician;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has active complaints/assignments
    if (userType === "client") {
      const activeComplaints = await Complaint.countDocuments({
        client: userId,
        status: { $in: ["pending", "assigned", "in-progress"] },
      });

      if (activeComplaints > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete client with active complaints",
        });
      }
    } else if (userType === "technician") {
      const activeAssignments = await Complaint.countDocuments({
        assignedTechnician: userId,
        status: { $in: ["assigned", "in-progress"] },
      });

      if (activeAssignments > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete technician with active assignments",
        });
      }
    }

    await Model.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({
      status: "pending",
    });
    const inProgressComplaints = await Complaint.countDocuments({
      status: "in-progress",
    });
    const resolvedComplaints = await Complaint.countDocuments({
      status: "resolved",
    });

    const totalClients = await Client.countDocuments();
    const totalTechnicians = await Technician.countDocuments();
    const activeTechnicians = await Technician.countDocuments({
      isActive: true,
    });

    // Recent complaints
    const recentComplaints = await Complaint.find()
      .populate("client", "name phoneNumber")
      .populate("createdByAdmin", "name phoneNumber")
      .populate("createdByTechnician", "name phoneNumber")
      .populate("assignedTechnician", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        totalClients,
        totalTechnicians,
        activeTechnicians,
        recentComplaints,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// create new client by admin
export const createClient = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const adminId = req.user.id;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and phone number are required",
      });
    }

    // normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if client already exists
    const existingClient = await Client.findOne({
      phoneNumber: normalizedPhone,
    });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "Client with this phone number already exists",
      });
    }

    const client = new Client({
      name: name.trim(),
      phoneNumber: normalizedPhone,
      isVerified: true,
      isActive: true,
    });

    await client.save();

    // Update admin's created clients list
    await Admin.findByIdAndUpdate(adminId, {
      $push: { createdClients: client._id },
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
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// create new technician by admin
export const createTechnician = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const adminId = req.user.id;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and phone number are required",
      });
    }

    // normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // check if technician already exists
    const existingTechnician = await Technician.findOne({
      phoneNumber: normalizedPhone,
    });
    if (existingTechnician) {
      return res.status(400).json({
        success: false,
        message: "Technician with this phone number already exists",
      });
    }

    const technician = new Technician({
      name: name.trim(),
      phoneNumber: normalizedPhone,
      isVerified: true,
      isActive: true,
    });

    await technician.save();

    // Update admin's created technicians list
    await Admin.findByIdAndUpdate(adminId, {
      $push: { createdTechnicians: technician._id },
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
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// update client information
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber } = req.body;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Normalize phone number if provided
    const normalizedPhone = phoneNumber
      ? normalizePhoneNumber(phoneNumber)
      : null;

    // Check if phone number is being changed and if it conflicts
    if (normalizedPhone && normalizedPhone !== client.phoneNumber) {
      const existingClient = await Client.findOne({
        phoneNumber: normalizedPhone,
        _id: { $ne: id },
      });
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use by another client",
        });
      }
    }

    if (name) client.name = name.trim();
    if (normalizedPhone) client.phoneNumber = normalizedPhone;

    await client.save();

    res.json({
      success: true,
      message: "Client updated successfully",
      client,
    });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// update technician information
export const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber } = req.body;

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    // Normalize phone number if provided
    const normalizedPhone = phoneNumber
      ? normalizePhoneNumber(phoneNumber)
      : null;

    // Check if phone number is being changed and if it conflicts
    if (normalizedPhone && normalizedPhone !== technician.phoneNumber) {
      const existingTechnician = await Technician.findOne({
        phoneNumber: normalizedPhone,
        _id: { $ne: id },
      });
      if (existingTechnician) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use by another technician",
        });
      }
    }

    if (name) technician.name = name.trim();
    if (normalizedPhone) technician.phoneNumber = normalizedPhone;

    await technician.save();

    res.json({
      success: true,
      message: "Technician updated successfully",
      technician,
    });
  } catch (error) {
    console.error("Update technician error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
