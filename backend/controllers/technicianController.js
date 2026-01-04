import jwt from "jsonwebtoken";
import Technician from "../models/Technician.js";
import OTP from "../models/OTP.js";
import { sendOTP } from "../config/msg91.js";
import Complaint from "../models/Complaint.js";
import Store from "../models/Store.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import { generateNextComplaintId } from "../utils/complaintId.js";
import { autoAssignComplaintToDefaultTechnician } from "../utils/autoAssign.js";

// ============================================
// HELPER FUNCTIONS
// ============================================

// generate 6-digit otp
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// generate jwt token for technician
const generateToken = (userId) => {
  return jwt.sign({ userId, role: "technician" }, process.env.JWT_SECRET, {
    expiresIn: "20d",
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

// send otp to technician's whatsapp
export const sendTechnicianOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // check if technician exists (admin-created accounts only)
    const existingTechnician = await Technician.findOne({
      phoneNumber: normalizedPhone,
    });
    if (!existingTechnician) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Please contact admin to create your account.",
      });
    }

    const otp = generateOTP();

    // delete any existing otp for this phone number
    await OTP.deleteMany({ phoneNumber: normalizedPhone, role: "technician" });

    // create new otp record
    const otpRecord = new OTP({
      phoneNumber: normalizedPhone,
      otp,
      role: "technician",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await otpRecord.save();

    // send otp via whatsapp
    const result = await sendOTP(`+91${normalizedPhone}`, otp);

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
    console.error("Send Technician OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// verify otp and login technician
export const verifyTechnicianOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // find valid otp
    const otpRecord = await OTP.findOne({
      phoneNumber: normalizedPhone,
      otp,
      role: "technician",
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

    // find existing technician
    let technician = await Technician.findOne({ phoneNumber: normalizedPhone });

    if (!technician) {
      return res.status(403).json({
        success: false,
        message: "Technician not found. Please contact admin.",
      });
    }

    // update technician info
    technician.isVerified = true;
    technician.lastLogin = new Date();
    if (name && name !== technician.name) {
      technician.name = name;
    }
    await technician.save();

    // generate jwt token
    const token = generateToken(technician._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: technician._id,
        phoneNumber: technician.phoneNumber,
        name: technician.name,
        role: "technician",
        isActive: technician.isActive,
      },
    });
  } catch (error) {
    console.error("Verify Technician OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// get current logged in technician
export const getCurrentTechnician = async (req, res) => {
  try {
    const technician = await Technician.findById(req.user.id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: technician._id,
        phoneNumber: technician.phoneNumber,
        name: technician.name,
        role: "technician",
        isActive: technician.isActive,
        lastLogin: technician.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get current technician error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================
// COMPLAINT MANAGEMENT FOR TECHNICIANS
// ============================================

// Create complaint by technician
export const createTechnicianComplaint = async (req, res) => {
  try {
    const { title, description, location, priority, storeId } = req.body;
    const technicianId = req.user.id;

    if (!title || !description || (!location && !storeId)) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and location are required",
      });
    }

    // Verify technician exists
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

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

    const complaint = new Complaint({
      complaintId,
      title,
      description,
      location: resolvedLocation,
      store: resolvedStoreId,
      priority: priority || "medium",
      photos,
      createdByTechnician: technicianId,
      creatorType: "technician",
    });

    await complaint.save();

    // Auto-assign every new complaint to the default technician (Soham)
    await autoAssignComplaintToDefaultTechnician({ complaint });

    // Populate technician info for response
    await complaint.populate("createdByTechnician", "name phoneNumber");
    await complaint.populate("store", "name managers");
    await complaint.populate("assignedTechnician", "name phoneNumber");

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create technician complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get technician's own complaints
export const getMyTechnicianComplaints = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const { default: Complaint } = await import("../models/Complaint.js");

    const filter = { createdByTechnician: technicianId };
    if (status) {
      filter.status = status;
    }

    const complaints = await Complaint.find(filter)
      .populate("assignedTechnician", "name phoneNumber")
      .populate("store", "name managers")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const { default: Store } = await import("../models/Store.js");

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

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      complaints: complaintsWithStore,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get my technician complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
