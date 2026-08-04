import Attendance from "../models/Attendance.js";

export const attendanceData = {
  findByUserAndDate: ({ userId, date }) =>
    Attendance.findOne({ userId: String(userId), date }),

  /**
   * The user's open session regardless of date — covers night shifts where
   * check-in and check-out straddle midnight.
   */
  findActive: (userId) =>
    Attendance.findOne({
      userId: String(userId),
      currentStatus: { $ne: "checked_out" },
    }),

  listForUser: ({ userId, limit }) =>
    Attendance.find({ userId: String(userId) }).sort({ date: -1 }).limit(limit),

  listByDate: (date) => Attendance.find({ date }),

  list: (filter = {}) =>
    Attendance.find(filter).sort({ date: -1, checkInTime: -1 }),

  create: (data) => Attendance.create(data),

  save: (record) => record.save(),
};
