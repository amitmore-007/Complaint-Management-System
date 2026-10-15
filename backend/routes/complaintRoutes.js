import express from "express";
import multer from "multer";

import {
  listComplaints,
  getComplaintById,
  getComplaintSheetUrl,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  duplicateComplaint,
  createBulkComplaints,
  getAssignedComplaints,
  getResolvedComplaints,
  updateComplaintStatus,
} from "../controllers/complaintController.js";
import {
  authenticateAny,
  authenticateTechnician,
} from "../middleware/roleAuth.js";

const router = express.Router();

// Photos only — 5 MB each, max 5.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
});

// Resolution media — images and video, so a much larger cap. The complaint
// sheet may also be a PDF.
const statusUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "complaintSheet") {
      if (
        file.mimetype.startsWith("image/") ||
        file.mimetype === "application/pdf"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Complaint sheet must be an image or PDF"), false);
      }
      return;
    }
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

/**
 * One complaint API for every role. Authorization is decided inside the
 * controller from req.user.role (services/complaintService.js) rather than by
 * having a separate endpoint and a separate near-identical handler per role.
 *
 * Admin-only operations that genuinely differ — assign, reassign, auto-assign
 * settings — remain under /api/admin.
 */

// Technician assignment views. Declared before "/:id" so the literal path wins.
router.get("/assigned/me", authenticateTechnician, getAssignedComplaints);
router.get(
  "/assigned/me/resolved",
  authenticateTechnician,
  getResolvedComplaints,
);

router.patch(
  "/:id/status",
  authenticateTechnician,
  statusUpload.fields([
    { name: "resolutionPhotos", maxCount: 5 },
    { name: "resolutionVideos", maxCount: 2 },
    { name: "complaintSheet", maxCount: 1 },
  ]),
  updateComplaintStatus,
);

router.post("/bulk", authenticateAny, createBulkComplaints);
router.post("/:id/duplicate", authenticateAny, duplicateComplaint);

router.get("/", authenticateAny, listComplaints);
router.post("/", authenticateAny, upload.array("photos", 5), createComplaint);

router.get("/:id/sheet", authenticateAny, getComplaintSheetUrl);
router.get("/:id", authenticateAny, getComplaintById);
router.put("/:id", authenticateAny, upload.array("photos", 5), updateComplaint);
router.delete("/:id", authenticateAny, deleteComplaint);

export default router;
