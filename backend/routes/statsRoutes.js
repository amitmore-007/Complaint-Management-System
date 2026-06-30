import express from "express";
import { authenticateAdmin } from "../middleware/roleAuth.js";
import {
  getComplaintCreatedVsResolvedStats,
  getComplaintCreatedVsResolvedDrilldownStats,
  getComplaintStatusFunnelStats,
  getComplaintStoreLeaderboardStats,
  getComplaintStoreLeaderboardDrilldownStats,
  getComplaintTimeToResolveStats,
  getComplaintAgingStats,
  getTechnicianAssignedVsResolvedStats,
  getComplaintAgingDrilldownStats,
  getComplaintTimeToResolveDrilldownStats,
  getTechnicianDrilldownStats,
  getComplaintStatusFunnelDrilldownStats,
} from "../controllers/statsController.js";

const router = express.Router();

router.get(
  "/complaints/created-vs-resolved",
  authenticateAdmin,
  getComplaintCreatedVsResolvedStats,
);

router.get(
  "/complaints/created-vs-resolved/drilldown",
  authenticateAdmin,
  getComplaintCreatedVsResolvedDrilldownStats,
);

router.get(
  "/complaints/status-funnel",
  authenticateAdmin,
  getComplaintStatusFunnelStats,
);

router.get(
  "/complaints/status-funnel/drilldown",
  authenticateAdmin,
  getComplaintStatusFunnelDrilldownStats,
);

router.get(
  "/complaints/store-leaderboard",
  authenticateAdmin,
  getComplaintStoreLeaderboardStats,
);

router.get(
  "/complaints/store-leaderboard/drilldown",
  authenticateAdmin,
  getComplaintStoreLeaderboardDrilldownStats,
);

router.get(
  "/complaints/time-to-resolve",
  authenticateAdmin,
  getComplaintTimeToResolveStats,
);

router.get("/complaints/aging", authenticateAdmin, getComplaintAgingStats);
router.get("/complaints/aging/drilldown", authenticateAdmin, getComplaintAgingDrilldownStats);
router.get("/complaints/time-to-resolve/drilldown", authenticateAdmin, getComplaintTimeToResolveDrilldownStats);

router.get(
  "/technicians/assigned-vs-resolved",
  authenticateAdmin,
  getTechnicianAssignedVsResolvedStats,
);
router.get("/technicians/drilldown", authenticateAdmin, getTechnicianDrilldownStats);

export default router;
