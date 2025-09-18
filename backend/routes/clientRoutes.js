import express from 'express';
import { sendClientOTP, verifyClientOTP, getCurrentClient } from '../controllers/clientAuthController.js';
import { authenticateClient } from '../middleware/roleAuth.js';

const router = express.Router();

// Authentication routes
router.post('/auth/send-otp', sendClientOTP);
router.post('/auth/verify-otp', verifyClientOTP);
router.get('/auth/me', authenticateClient, getCurrentClient);

export default router;
