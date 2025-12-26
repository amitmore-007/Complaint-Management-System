import { getIntervalAndRange } from "../utils/dateRange.js";
import {
  getComplaintsCreatedVsResolved,
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

    // This endpoint is totals per tech, so interval isn't needed.
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
