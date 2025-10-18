import express from 'express';
import multer from 'multer';
import { sendTechnicianOTP, verifyTechnicianOTP, getCurrentTechnician } from '../controllers/technicianAuthController.js';
import { authenticateTechnician } from '../middleware/roleAuth.js';
import { getAssignedComplaints, updateComplaintStatus, getResolvedComplaints } from '../controllers/complaintController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Authentication routes
router.post('/auth/send-otp', sendTechnicianOTP);
router.post('/auth/verify-otp', verifyTechnicianOTP);
router.get('/auth/me', authenticateTechnician, getCurrentTechnician);

// Complaint routes - ensure these are working
router.get('/assignments', authenticateTechnician, getAssignedComplaints);
router.get('/resolved-assignments', authenticateTechnician, getResolvedComplaints);
router.patch('/assignments/:id/status', authenticateTechnician, upload.array('resolutionPhotos', 5), updateComplaintStatus);

export default router;
