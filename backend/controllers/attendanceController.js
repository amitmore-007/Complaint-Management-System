import { attendanceService } from "../services/attendanceService.js";
import { respondWithError } from "../utils/httpError.js";

/**
 * HTTP only. Business rules live in services/attendanceService.js; database
 * access in data/attendanceData.js.
 */

// POST /api/attendance/check-in
export const checkIn = async (req, res) => {
  try {
    const { record, created } = await attendanceService.checkIn(req.user);
    res.status(created ? 201 : 200).json({ success: true, attendance: record });
  } catch (error) {
    console.error("Check-in error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/attendance/break/start
export const startBreak = async (req, res) => {
  try {
    const attendance = await attendanceService.startBreak(req.user.id);
    res.status(200).json({ success: true, attendance });
  } catch (error) {
    console.error("Start break error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/attendance/break/end
export const endBreak = async (req, res) => {
  try {
    const attendance = await attendanceService.endBreak(req.user.id);
    res.status(200).json({ success: true, attendance });
  } catch (error) {
    console.error("End break error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/attendance/check-out
export const checkOut = async (req, res) => {
  try {
    const attendance = await attendanceService.checkOut(req.user.id);
    res.status(200).json({ success: true, attendance });
  } catch (error) {
    console.error("Check-out error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/attendance/today
export const getToday = async (req, res) => {
  try {
    const attendance = await attendanceService.getToday(req.user.id);
    res.status(200).json({ success: true, attendance });
  } catch (error) {
    console.error("Get today error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/attendance/history
export const getHistory = async (req, res) => {
  try {
    const records = await attendanceService.getHistory({
      userId: req.user.id,
      limit: req.query.limit,
    });

    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error("Get history error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/attendance/summary  (admin)
export const getSummary = async (req, res) => {
  try {
    const summary = await attendanceService.getSummary(req.query.date);
    res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("Summary error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/attendance  (admin)
export const listAll = async (req, res) => {
  try {
    const records = await attendanceService.listAll(req.query);
    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error("List attendance error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// ---- portal (token + PIN, no login required) ----

// POST /api/attendance/portal/:token/session
export const verifyPortalPin = async (req, res) => {
  try {
    const result = await attendanceService.verifyPortalPin({
      token: req.params.token,
      pin: req.body.pin,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Portal verify PIN error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// GET /api/attendance/portal/:token/status
export const getPortalStatus = async (req, res) => {
  try {
    const attendance = await attendanceService.getToday(req.user.id);

    res.json({
      success: true,
      attendance,
      user: { name: req.user.name, role: req.user.role },
    });
  } catch (error) {
    console.error("Portal status error:", error);
    respondWithError(res, error, "Internal server error");
  }
};

// POST /api/attendance/portal/:token/record
export const createPortalRecord = async (req, res) => {
  const handlers = {
    check_in: checkIn,
    check_out: checkOut,
    break_start: startBreak,
    break_end: endBreak,
  };

  const handler = handlers[req.body.action];
  if (!handler) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid action. Allowed: check_in, check_out, break_start, break_end",
    });
  }

  try {
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      console.error("Portal record error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};
