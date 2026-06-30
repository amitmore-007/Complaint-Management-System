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
  verifyPortalPin,
  getPortalStatus,
  createPortalRecord,
} from '../controllers/attendanceController.js';
import { authenticateAny, authenticateAdmin, authenticatePortal } from '../middleware/roleAuth.js';

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

// portal (token-link based, no login required)
router.post('/portal/:token/session', verifyPortalPin);
router.get('/portal/:token/status', authenticatePortal, getPortalStatus);
router.post('/portal/:token/record', authenticatePortal, createPortalRecord);

export default router;
