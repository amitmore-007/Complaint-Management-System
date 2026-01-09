import { getIntervalAndRange } from "../utils/dateRange.js";
import {
  getComplaintsCreatedVsResolved,
  getComplaintsStatusFunnel,
  getComplaintsStoreLeaderboard,
  getComplaintsTimeToResolve,
  getComplaintsAgingBuckets,
  getTechniciansAssignedVsResolved,
} from "../services/statsService.js";

export const getComplaintCreatedVsResolvedStats = async (req, res) => {
  try {
    const { interval, from, to, tz } = req.query;
    const range = getIntervalAndRange({ interval, from, to, tz });

    const data = await getComplaintsCreatedVsResolved({
      from: range.from,
      to: range.to,
      interval: range.interval,
      timezone: range.timezone,
    });

    res.status(200).json({
      success: true,
      range: {
        interval: range.interval,
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Created vs resolved stats error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getTechnicianAssignedVsResolvedStats = async (req, res) => {
  try {
    const { from, to, tz } = req.query;

    const range = getIntervalAndRange({ interval: "month", from, to, tz });

    const data = await getTechniciansAssignedVsResolved({
      from: range.from,
      to: range.to,
    });

    res.status(200).json({
      success: true,
      range: {
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Technician assigned vs resolved stats error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getComplaintStatusFunnelStats = async (req, res) => {
  try {
    const { from, to, tz } = req.query;
    const range = getIntervalAndRange({ interval: "month", from, to, tz });

    const data = await getComplaintsStatusFunnel({
      from: range.from,
      to: range.to,
    });

    res.status(200).json({
      success: true,
      range: {
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Status funnel stats error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getComplaintStoreLeaderboardStats = async (req, res) => {
  try {
    const { from, to, tz, limit } = req.query;
    const range = getIntervalAndRange({ interval: "month", from, to, tz });

    const data = await getComplaintsStoreLeaderboard({
      from: range.from,
      to: range.to,
      limit,
    });

    res.status(200).json({
      success: true,
      range: {
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Store leaderboard stats error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getComplaintTimeToResolveStats = async (req, res) => {
  try {
    const { interval, from, to, tz } = req.query;
    const range = getIntervalAndRange({ interval, from, to, tz });

    const data = await getComplaintsTimeToResolve({
      from: range.from,
      to: range.to,
      interval: range.interval,
      timezone: range.timezone,
    });

    res.status(200).json({
      success: true,
      range: {
        interval: range.interval,
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Time to resolve stats error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getComplaintAgingStats = async (req, res) => {
  try {
    const { from, to, tz } = req.query;
    const range = getIntervalAndRange({ interval: "month", from, to, tz });

    const data = await getComplaintsAgingBuckets({
      from: range.from,
      to: range.to,
      timezone: range.timezone,
    });

    res.status(200).json({
      success: true,
      range: {
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Aging stats error:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
