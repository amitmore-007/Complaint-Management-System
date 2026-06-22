import express from 'express';
import {
  checkIn,
  startBreak,
  endBreak,
  checkOut,
  getToday,
  getHistory,
  getSummary,
  listAll,
} from '../controllers/attendanceController.js';
import { authenticateAny, authenticateAdmin } from '../middleware/roleAuth.js';

const router = express.Router();

// any authenticated user
router.post('/check-in', authenticateAny, checkIn);
router.post('/break/start', authenticateAny, startBreak);
router.post('/break/end', authenticateAny, endBreak);
router.post('/check-out', authenticateAny, checkOut);
router.get('/today', authenticateAny, getToday);
router.get('/history', authenticateAny, getHistory);

// admin only
router.get('/summary', authenticateAdmin, getSummary);
router.get('/', authenticateAdmin, listAll);

export default router;
