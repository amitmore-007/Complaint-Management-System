import express from "express";
import multer from "multer";
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getAssignedComplaints,
  updateComplaintStatus,
} from "../controllers/complaintController.js";
import {
  authenticateClient,
  authenticateTechnician,
} from "../middleware/roleAuth.js";

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

// Client routes
router.post(
  "/",
  authenticateClient,
  upload.array("photos", 5),
  createComplaint
);
router.get("/my", authenticateClient, getMyComplaints);
router.get("/assigned/me", authenticateTechnician, getAssignedComplaints);
router.get("/:id", authenticateClient, getComplaintById);
router.put(
  "/:id",
  authenticateClient,
  upload.array("photos", 5),
  updateComplaint
);
router.delete("/:id", authenticateClient, deleteComplaint);

// Technician routes
router.patch("/:id/status", authenticateTechnician, updateComplaintStatus);

export default router;
