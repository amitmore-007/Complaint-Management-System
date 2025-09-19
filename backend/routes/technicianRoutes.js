import express from 'express';
import { sendTechnicianOTP, verifyTechnicianOTP, getCurrentTechnician } from '../controllers/technicianAuthController.js';
import { authenticateTechnician } from '../middleware/roleAuth.js';
import { getAssignedComplaints, updateComplaintStatus } from '../controllers/complaintController.js';

const router = express.Router();

// Authentication routes
router.post('/auth/send-otp', sendTechnicianOTP);
router.post('/auth/verify-otp', verifyTechnicianOTP);
router.get('/auth/me', authenticateTechnician, getCurrentTechnician);

// Complaint routes - ensure these are working
router.get('/assignments', authenticateTechnician, getAssignedComplaints);
router.patch('/assignments/:id/status', authenticateTechnician, updateComplaintStatus);

export default router;
