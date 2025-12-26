import express from "express";
import { authenticateAdmin } from "../middleware/roleAuth.js";
import {
  getComplaintCreatedVsResolvedStats,
  getTechnicianAssignedVsResolvedStats,
} from "../controllers/statsController.js";

const router = express.Router();

router.get(
  "/complaints/created-vs-resolved",
  authenticateAdmin,
  getComplaintCreatedVsResolvedStats
);

router.get(
  "/technicians/assigned-vs-resolved",
  authenticateAdmin,
  getTechnicianAssignedVsResolvedStats
);

export default router;
