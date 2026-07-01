import express from "express";
import multer from "multer";
import {
  sendTechnicianOTP,
  verifyTechnicianOTP,
  getCurrentTechnician,
  createTechnicianComplaint,
  getMyTechnicianComplaints,
} from "../controllers/technicianController.js";
import { authenticateTechnician } from "../middleware/roleAuth.js";
import {
  getAssignedComplaints,
  updateComplaintStatus,
  getResolvedComplaints,
  createBulkComplaints,
} from "../controllers/complaintController.js";
import {
  technicianCreateBillingRecord,
  technicianListBillingRecords,
} from "../controllers/billingController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Separate multer for status updates — allows images + videos
const statusUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for videos
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video files are allowed!"), false);
    }
  },
});

// Authentication routes
router.post("/auth/send-otp", sendTechnicianOTP);
router.post("/auth/verify-otp", verifyTechnicianOTP);
router.get("/auth/me", authenticateTechnician, getCurrentTechnician);

// Technician complaint creation routes
router.post("/complaints/bulk", authenticateTechnician, createBulkComplaints);
router.post(
  "/complaints",
  authenticateTechnician,
  upload.array("photos", 5),
  createTechnicianComplaint
);
router.get("/complaints/my", authenticateTechnician, getMyTechnicianComplaints);

// Complaint routes - ensure these are working
router.get("/assignments", authenticateTechnician, getAssignedComplaints);
router.get(
  "/resolved-assignments",
  authenticateTechnician,
  getResolvedComplaints
);
router.patch(
  "/assignments/:id/status",
  authenticateTechnician,
  statusUpload.fields([
    { name: "resolutionPhotos", maxCount: 5 },
    { name: "resolutionVideos", maxCount: 2 },
  ]),
  updateComplaintStatus
);

router.get("/billing", authenticateTechnician, technicianListBillingRecords);
router.post(
  "/billing",
  authenticateTechnician,
  upload.any(),
  technicianCreateBillingRecord
);

export default router;
