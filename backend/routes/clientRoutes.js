import express from 'express';
import { sendClientOTP, verifyClientOTP, getCurrentClient } from '../controllers/clientAuthController.js';
import { authenticateClient } from '../middleware/roleAuth.js';
import { 
  getMyComplaints, 
  getComplaintById, 
  createComplaint, 
  updateComplaint, 
  deleteComplaint 
} from '../controllers/complaintController.js';
import multer from 'multer';

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Authentication routes
router.post('/auth/send-otp', sendClientOTP);
router.post('/auth/verify-otp', verifyClientOTP);
router.get('/auth/me', authenticateClient, getCurrentClient);

// Complaint routes for clients
router.get('/complaints', authenticateClient, getMyComplaints);
router.get('/complaints/:id', authenticateClient, getComplaintById);
router.post('/complaints', authenticateClient, upload.array('photos', 5), createComplaint);
router.put('/complaints/:id', authenticateClient, upload.array('photos', 5), updateComplaint);
router.delete('/complaints/:id', authenticateClient, deleteComplaint);

export default router;
