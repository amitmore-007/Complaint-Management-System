import User from "../models/User.js";

export const userData = {
  findById: (id) => User.findById(id),

  findByIdAndRole: ({ id, role }) => User.findOne({ _id: id, role }),

  findByPhoneAndRole: ({ phoneNumber, role }) =>
    User.findOne({ phoneNumber, role }),

  /** Attendance portal links are looked up by their opaque token. */
  findByAttendanceToken: (token) =>
    User.findOne({
      attendanceToken: token,
      role: { $in: ["admin", "technician"] },
    }).select("+attendanceToken +attendancePin"),

  findIdsByNameMatch: async (regex) => {
    const users = await User.find({ name: regex }).select("_id");
    return users.map((u) => u._id);
  },

  findIdsByNameMatchAndRole: async ({ regex, role }) => {
    const users = await User.find({ name: regex, role }).select("_id");
    return users.map((u) => u._id);
  },

  list: ({ filter = {}, select, page = 1, limit = 50 }) => {
    const query = User.find(filter).sort({ createdAt: -1 });
    if (select) query.select(select);
    return query.limit(limit).skip((page - 1) * limit);
  },

  count: (filter = {}) => User.countDocuments(filter),

  listActiveByRole: (role) =>
    User.find({ role, isActive: true }).sort({ _id: 1 }),

  findActiveByPhoneAndRole: ({ phoneNumber, role }) =>
    User.findOne({ phoneNumber, role, isActive: true }).select(
      "name phoneNumber",
    ),

  create: (data) => User.create(data),

  save: (user) => user.save(),

  deleteById: (id) => User.findByIdAndDelete(id),

  /** Position of this user's last geofenced action, for the next speed check. */
  findLastKnownLocation: async (id) => {
    const user = await User.findById(id).select("lastKnownLocation");
    return user?.lastKnownLocation ?? null;
  },

  setLastKnownLocation: ({ id, lat, lng, capturedAt }) =>
    User.findByIdAndUpdate(id, {
      lastKnownLocation: { lat, lng, capturedAt },
    }),

  setAttendanceToken: ({ id, attendanceToken, attendancePin }) =>
    User.findByIdAndUpdate(id, { attendanceToken, attendancePin }),

  clearAttendanceToken: ({ id, role }) =>
    User.findOneAndUpdate(
      { _id: id, role },
      { $unset: { attendanceToken: 1, attendancePin: 1 } },
    ),
};
