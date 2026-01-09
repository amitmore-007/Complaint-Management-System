import express from "express";
import { authenticateAdmin } from "../middleware/roleAuth.js";
import {
  getComplaintCreatedVsResolvedStats,
  getComplaintStatusFunnelStats,
  getComplaintStoreLeaderboardStats,
  getComplaintTimeToResolveStats,
  getComplaintAgingStats,
  getTechnicianAssignedVsResolvedStats,
} from "../controllers/statsController.js";

const router = express.Router();

router.get(
  "/complaints/created-vs-resolved",
  authenticateAdmin,
  getComplaintCreatedVsResolvedStats
);

router.get(
  "/complaints/status-funnel",
  authenticateAdmin,
  getComplaintStatusFunnelStats
);

router.get(
  "/complaints/store-leaderboard",
  authenticateAdmin,
  getComplaintStoreLeaderboardStats
);

router.get(
  "/complaints/time-to-resolve",
  authenticateAdmin,
  getComplaintTimeToResolveStats
);

router.get("/complaints/aging", authenticateAdmin, getComplaintAgingStats);

router.get(
  "/technicians/assigned-vs-resolved",
  authenticateAdmin,
  getTechnicianAssignedVsResolvedStats
);

export default router;
