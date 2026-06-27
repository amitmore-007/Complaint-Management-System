import {
  getIntervalAndRange,
  getPeriodBucketRange,
  getStatsRange,
} from "../utils/dateRange.js";
import {
  getComplaintsCreatedVsResolved,
  getComplaintsCreatedVsResolvedDrilldown,
  getComplaintsStatusFunnel,
  getComplaintsStoreLeaderboard,
  getComplaintsStoreLeaderboardDrilldown,
  getComplaintsTimeToResolve,
  getComplaintsAgingBuckets,
  getTechniciansAssignedVsResolved,
  getComplaintsAgingDrilldown,
  getComplaintsTimeToResolveDrilldown,
  getTechnicianDrilldown,
  getComplaintsStatusFunnelDrilldown,
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

export const getComplaintCreatedVsResolvedDrilldownStats = async (req, res) => {
  try {
    const { interval, period, tz } = req.query;
    const range = getPeriodBucketRange({ interval, period, tz });

    const data = await getComplaintsCreatedVsResolvedDrilldown({
      from: range.from,
      to: range.to,
    });

    res.status(200).json({
      success: true,
      range: {
        interval: range.interval,
        period: range.period,
        timezone: range.timezone,
        from: range.fromISO,
        to: range.toISO,
      },
      data,
    });
  } catch (error) {
    console.error("Created vs resolved drilldown stats error:", error);
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

export const getComplaintStoreLeaderboardDrilldownStats = async (req, res) => {
  try {
    const { storeName, from, to, tz } = req.query;

    if (!storeName || String(storeName).trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "storeName is required" });
    }

    const range = getStatsRange({ from, to, tz });

    const data = await getComplaintsStoreLeaderboardDrilldown({
      storeName,
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
    console.error("Store leaderboard drilldown stats error:", error);
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

export const getComplaintAgingDrilldownStats = async (req, res) => {
  try {
    const { bucket, from, to, tz } = req.query;
    if (!bucket || String(bucket).trim() === "") {
      return res.status(400).json({ success: false, message: "bucket is required" });
    }
    const range = getStatsRange({ from, to, tz });
    const data = await getComplaintsAgingDrilldown({
      bucket: String(bucket).trim(),
      from: range.from,
      to: range.to,
      timezone: range.timezone,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Aging drilldown error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const getComplaintTimeToResolveDrilldownStats = async (req, res) => {
  try {
    const { interval, period, tz } = req.query;
    const range = getPeriodBucketRange({ interval, period, tz });
    const data = await getComplaintsTimeToResolveDrilldown({ from: range.from, to: range.to });
    res.status(200).json({
      success: true,
      range: { interval: range.interval, period: range.period, from: range.fromISO, to: range.toISO },
      data,
    });
  } catch (error) {
    console.error("TTR drilldown error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Internal server error" });
  }
};

export const getTechnicianDrilldownStats = async (req, res) => {
  try {
    const { technicianId, from, to, tz } = req.query;
    if (!technicianId || String(technicianId).trim() === "") {
      return res.status(400).json({ success: false, message: "technicianId is required" });
    }
    const range = getStatsRange({ from, to, tz });
    const data = await getTechnicianDrilldown({ technicianId, from: range.from, to: range.to });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Technician drilldown error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Internal server error" });
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

export const getComplaintStatusFunnelDrilldownStats = async (req, res) => {
  try {
    const { status, from, to, tz } = req.query;

    if (!status) {
      return res.status(400).json({ success: false, message: "status is required" });
    }

    const range = getStatsRange({ from, to, tz });
    const data = await getComplaintsStatusFunnelDrilldown({
      status,
      from: range.from,
      to: range.to,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Status funnel drilldown error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Internal server error" });
  }
};
