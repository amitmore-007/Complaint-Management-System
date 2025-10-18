import express from 'express';
import { sendAdminOTP, verifyAdminOTP, getCurrentAdmin } from '../controllers/adminAuthController.js';
import { authenticateAdmin } from '../middleware/roleAuth.js';

const router = express.Router();

// Authentication routes
router.post('/auth/send-otp', sendAdminOTP);
router.post('/auth/verify-otp', verifyAdminOTP);
router.get('/auth/me', authenticateAdmin, getCurrentAdmin);

export default router;
