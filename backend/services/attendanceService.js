import jwt from "jsonwebtoken";
import { DateTime } from "luxon";

import { attendanceData } from "../data/attendanceData.js";
import { userData } from "../data/userData.js";
import { createHttpError } from "../utils/httpError.js";
import { portalHashPin } from "../utils/portalPin.js";

// IST, so "today" flips at midnight in India rather than UTC.
const todayDate = () =>
  DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM-dd");

const secondsSince = (date) =>
  Math.floor((Date.now() - new Date(date).getTime()) / 1000);

// DocumentArray on older Node lacks findLast.
const findLast = (arr, predicate) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return arr[i];
  }
  return undefined;
};

/** Close the open session and bank its elapsed time. */
const closeOpenSession = (record, now, onlyType = null) => {
  const open = findLast(
    record.sessions,
    (s) => !s.endTime && (!onlyType || s.type === onlyType),
  );
  if (!open) return;

  open.endTime = now;
  if (open.type === "work") {
    record.totalWorkSeconds += secondsSince(open.startTime);
  } else {
    record.totalBreakSeconds += secondsSince(open.startTime);
  }
};

export const attendanceService = {
  todayDate,

  checkIn: async ({ id: userId, role: userRole, name: userName, phoneNumber: userPhone }) => {
    const date = todayDate();

    // One open session at a time, including across a night-shift boundary.
    const active = await attendanceData.findActive(userId);
    if (active) {
      throw createHttpError(
        400,
        active.date === date
          ? "You are already checked in."
          : "You have an active session from a previous shift. Please check out first.",
      );
    }

    const now = new Date();
    const todayRecord = await attendanceData.findByUserAndDate({ userId, date });

    // Split shift: re-open today's closed record rather than creating a second.
    if (todayRecord) {
      todayRecord.currentStatus = "working";
      todayRecord.currentSessionStart = now;
      todayRecord.checkOutTime = null;
      todayRecord.sessions.push({ type: "work", startTime: now });
      todayRecord.markModified("sessions");
      await attendanceData.save(todayRecord);

      return { record: todayRecord, created: false };
    }

    const record = await attendanceData.create({
      userId: String(userId),
      userRole,
      userName,
      userPhone,
      date,
      checkInTime: now,
      currentStatus: "working",
      currentSessionStart: now,
      sessions: [{ type: "work", startTime: now }],
    });

    return { record, created: true };
  },

  startBreak: async (userId) => {
    const record = await attendanceData.findActive(userId);
    if (!record) throw createHttpError(400, "You have not checked in today.");
    if (record.currentStatus !== "working") {
      throw createHttpError(400, "You are already on a break.");
    }

    const now = new Date();
    closeOpenSession(record, now, "work");

    record.sessions.push({ type: "break", startTime: now });
    record.currentStatus = "on_break";
    record.currentSessionStart = now;
    record.markModified("sessions");

    await attendanceData.save(record);
    return record;
  },

  endBreak: async (userId) => {
    const record = await attendanceData.findActive(userId);
    if (!record || record.currentStatus !== "on_break") {
      throw createHttpError(400, "You are not on a break.");
    }

    const now = new Date();
    closeOpenSession(record, now, "break");

    record.sessions.push({ type: "work", startTime: now });
    record.currentStatus = "working";
    record.currentSessionStart = now;
    record.markModified("sessions");

    await attendanceData.save(record);
    return record;
  },

  checkOut: async (userId) => {
    const record = await attendanceData.findActive(userId);
    if (!record) throw createHttpError(400, "You have not checked in today.");

    const now = new Date();
    closeOpenSession(record, now);

    record.currentStatus = "checked_out";
    record.currentSessionStart = null;
    record.checkOutTime = now;
    record.markModified("sessions");

    await attendanceData.save(record);
    return record;
  },

  /** Today's record, falling back to any still-open night-shift session. */
  getToday: async (userId) =>
    (await attendanceData.findByUserAndDate({ userId, date: todayDate() })) ||
    (await attendanceData.findActive(userId)) ||
    null,

  getHistory: ({ userId, limit }) =>
    attendanceData.listForUser({
      userId,
      limit: Math.min(parseInt(limit, 10) || 30, 90),
    }),

  getSummary: async (date) => {
    const records = await attendanceData.listByDate(date || todayDate());

    const [activeAdmins, activeTechnicians] = await Promise.all([
      userData.count({ role: "admin", isActive: true }),
      userData.count({ role: "technician", isActive: true }),
    ]);

    const totalActive = activeAdmins + activeTechnicians;
    const totalCheckedIn = records.length;

    return {
      working: records.filter((r) => r.currentStatus === "working").length,
      on_break: records.filter((r) => r.currentStatus === "on_break").length,
      checked_out: records.filter((r) => r.currentStatus === "checked_out").length,
      total_checked_in: totalCheckedIn,
      not_checked_in: Math.max(0, totalActive - totalCheckedIn),
      total_active: totalActive,
    };
  },

  /** from/to takes priority over a single `date` when both are supplied. */
  listAll: ({ date, userRole, userId, from, to }) => {
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    } else if (date) {
      filter.date = date;
    }

    if (userRole) filter.userRole = userRole;
    if (userId) filter.userId = userId;

    return attendanceData.list(filter);
  },

  // ---- portal (link + PIN, no login) ----

  verifyPortalPin: async ({ token, pin }) => {
    if (!pin || !/^\d{4}$/.test(pin)) {
      throw createHttpError(400, "PIN must be exactly 4 digits.");
    }

    const user = await userData.findByAttendanceToken(token);
    if (!user) throw createHttpError(404, "Invalid or expired link.");

    if (!user.isActive) {
      throw createHttpError(403, "Your account is inactive. Contact admin.");
    }
    if (!user.attendancePin) {
      throw createHttpError(400, "PIN not configured. Contact admin.");
    }
    if (portalHashPin(pin, token) !== user.attendancePin) {
      throw createHttpError(401, "Incorrect PIN.");
    }

    const sessionToken = jwt.sign(
      { userId: String(user._id), role: user.role, scope: "attendance-portal" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return { sessionToken, user: { name: user.name, role: user.role } };
  },
};
