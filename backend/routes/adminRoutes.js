import express from "express";
import multer from "multer";
import {
  sendAdminOTP,
  verifyAdminOTP,
  getCurrentAdmin,
  getAllComplaints,
  assignComplaint,
  getAllClients,
  getAllTechnicians,
  toggleUserStatus,
  deleteUser,
  getDashboardStats,
  getComplaintById,
  createClient,
  createTechnician,
  updateClient,
  updateTechnician,
  createAdminComplaint,
} from "../controllers/adminController.js";
import { authenticateAdmin } from "../middleware/roleAuth.js";

const router = express.Router();

// Configure multer for file uploads - using memory storage for direct Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// authentication routes
router.post("/auth/send-otp", sendAdminOTP);
router.post("/auth/verify-otp", verifyAdminOTP);
router.get("/auth/me", authenticateAdmin, getCurrentAdmin);

// dashboard
router.get("/dashboard/stats", authenticateAdmin, getDashboardStats);

// complaint management
router.get("/complaints", authenticateAdmin, getAllComplaints);
router.get("/complaints/:id", authenticateAdmin, getComplaintById);
router.post(
  "/complaints",
  authenticateAdmin,
  upload.array("photos", 5),
  createAdminComplaint
);
router.post("/complaints/assign", authenticateAdmin, assignComplaint);

// user management - clients
router.get("/clients", authenticateAdmin, getAllClients);
router.post("/clients", authenticateAdmin, createClient);
router.put("/clients/:id", authenticateAdmin, updateClient);

// user management - technicians
router.get("/technicians", authenticateAdmin, getAllTechnicians);
router.post("/technicians", authenticateAdmin, createTechnician);
router.put("/technicians/:id", authenticateAdmin, updateTechnician);

// user management - general
router.patch(
  "/users/:userId/toggle-status",
  authenticateAdmin,
  toggleUserStatus
);
router.delete("/users/:userId", authenticateAdmin, deleteUser);

export default router;
