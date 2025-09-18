import express from 'express';
import { sendOTPController, verifyOTPController, getCurrentUser } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/send-otp', sendOTPController);
router.post('/verify-otp', verifyOTPController);
router.get('/me', authenticateToken, getCurrentUser);

export default router;
