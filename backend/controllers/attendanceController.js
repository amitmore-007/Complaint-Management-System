import { DateTime } from 'luxon';
import Attendance from '../models/Attendance.js';
import Admin from '../models/Admin.js';
import Technician from '../models/Technician.js';

// Bug fix #2: use IST so midnight in India is always correct
const todayDate = () => DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');

const secondsSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 1000);

// Bug fix #1: findLast polyfill — DocumentArray on older Node won't have it
const findLast = (arr, predicate) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return arr[i];
  }
  return undefined;
};

// POST /api/attendance/check-in
export const checkIn = async (req, res) => {
  try {
    const { id: userId, role: userRole, name: userName, phoneNumber: userPhone } = req.user;
    const date = todayDate();

    const existing = await Attendance.findOne({ userId: String(userId), date });
    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          existing.currentStatus === 'checked_out'
            ? 'You have already checked out for today.'
            : 'You are already checked in.',
      });
    }

    const now = new Date();
    const record = await Attendance.create({
      userId: String(userId),
      userRole,
      userName,
      userPhone,
      date,
      checkInTime: now,
      currentStatus: 'working',
      currentSessionStart: now,
      sessions: [{ type: 'work', startTime: now }],
    });

    res.status(201).json({ success: true, attendance: record });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/attendance/break/start
export const startBreak = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const date = todayDate();

    const record = await Attendance.findOne({ userId: String(userId), date });
    if (!record) {
      return res.status(400).json({ success: false, message: 'You have not checked in today.' });
    }
    if (record.currentStatus !== 'working') {
      return res.status(400).json({
        success: false,
        message:
          record.currentStatus === 'on_break'
            ? 'You are already on a break.'
            : 'You have already checked out.',
      });
    }

    const now = new Date();

    // close the open work session
    const openWork = findLast(record.sessions, (s) => s.type === 'work' && !s.endTime);
    if (openWork) {
      openWork.endTime = now;
      record.totalWorkSeconds += secondsSince(openWork.startTime);
    }

    // open a break session
    record.sessions.push({ type: 'break', startTime: now });
    record.currentStatus = 'on_break';
    record.currentSessionStart = now;

    // Bug fix #4: tell Mongoose the nested array changed
    record.markModified('sessions');
    await record.save();
    res.status(200).json({ success: true, attendance: record });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/attendance/break/end
export const endBreak = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const date = todayDate();

    const record = await Attendance.findOne({ userId: String(userId), date });
    if (!record || record.currentStatus !== 'on_break') {
      return res.status(400).json({ success: false, message: 'You are not on a break.' });
    }

    const now = new Date();

    // close the open break session
    const openBreak = findLast(record.sessions, (s) => s.type === 'break' && !s.endTime);
    if (openBreak) {
      openBreak.endTime = now;
      record.totalBreakSeconds += secondsSince(openBreak.startTime);
    }

    // open a new work session
    record.sessions.push({ type: 'work', startTime: now });
    record.currentStatus = 'working';
    record.currentSessionStart = now;

    // Bug fix #4
    record.markModified('sessions');
    await record.save();
    res.status(200).json({ success: true, attendance: record });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/attendance/check-out
export const checkOut = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const date = todayDate();

    const record = await Attendance.findOne({ userId: String(userId), date });
    if (!record) {
      return res.status(400).json({ success: false, message: 'You have not checked in today.' });
    }
    if (record.currentStatus === 'checked_out') {
      return res.status(400).json({ success: false, message: 'You have already checked out.' });
    }

    const now = new Date();

    // close whatever session is open (work or break)
    const openSession = findLast(record.sessions, (s) => !s.endTime);
    if (openSession) {
      openSession.endTime = now;
      if (openSession.type === 'work') {
        record.totalWorkSeconds += secondsSince(openSession.startTime);
      } else {
        record.totalBreakSeconds += secondsSince(openSession.startTime);
      }
    }

    record.currentStatus = 'checked_out';
    record.currentSessionStart = null;
    record.checkOutTime = now;

    // Bug fix #4
    record.markModified('sessions');
    await record.save();
    res.status(200).json({ success: true, attendance: record });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/attendance/today
export const getToday = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const date = todayDate();

    const record = await Attendance.findOne({ userId: String(userId), date });
    res.status(200).json({ success: true, attendance: record || null });
  } catch (error) {
    console.error('Get today error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/attendance/history  (any authenticated user — own records)
// query params: limit (default 30)
export const getHistory = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const limit = Math.min(parseInt(req.query.limit) || 30, 90);

    const records = await Attendance.find({ userId: String(userId) })
      .sort({ date: -1 })
      .limit(limit);

    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/attendance/summary  (admin only)
// query params: date (default today)
export const getSummary = async (req, res) => {
  try {
    const date = req.query.date || todayDate();

    const records = await Attendance.find({ date });

    const working = records.filter((r) => r.currentStatus === 'working').length;
    const on_break = records.filter((r) => r.currentStatus === 'on_break').length;
    const checked_out = records.filter((r) => r.currentStatus === 'checked_out').length;
    const totalCheckedIn = records.length;

    const [activeAdmins, activeTechnicians] = await Promise.all([
      Admin.countDocuments({ isActive: true }),
      Technician.countDocuments({ isActive: true }),
    ]);

    const totalActive = activeAdmins + activeTechnicians;
    const notCheckedIn = Math.max(0, totalActive - totalCheckedIn);

    res.status(200).json({
      success: true,
      summary: { working, on_break, checked_out, total_checked_in: totalCheckedIn, not_checked_in: notCheckedIn, total_active: totalActive },
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/attendance  (admin only)
// query params: date, userRole, userId, from, to
// Bug fix #3: date and from/to are mutually exclusive — from/to takes priority if both given
export const listAll = async (req, res) => {
  try {
    const { date, userRole, userId, from, to } = req.query;
    const filter = {};

    if (from || to) {
      // date range — ignore single date param
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    } else if (date) {
      filter.date = date;
    }

    if (userRole) filter.userRole = userRole;
    if (userId) filter.userId = userId;

    const records = await Attendance.find(filter).sort({ date: -1, checkInTime: -1 });
    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error('List attendance error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
