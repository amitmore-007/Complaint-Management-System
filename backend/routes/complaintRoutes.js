import express from 'express';
import multer from 'multer';
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getAssignedComplaints,
  updateComplaintStatus
} from '../controllers/complaintController.js';
import { authenticateClient, authenticateTechnician } from '../middleware/roleAuth.js';

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

// Client routes
router.post('/', authenticateClient, upload.array('photos', 5), createComplaint);
router.get('/my', authenticateClient, getMyComplaints);
router.get('/assigned/me', authenticateTechnician, getAssignedComplaints);
router.get('/:id', authenticateClient, getComplaintById);
router.put('/:id', authenticateClient, upload.array('photos', 5), updateComplaint);
router.delete('/:id', authenticateClient, deleteComplaint);

// Technician routes
router.patch('/:id/status', authenticateTechnician, updateComplaintStatus);

// Debug routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/message-status/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const client = (await import('../config/twilio.js')).default;
      
      const message = await client.messages(messageId).fetch();
      
      res.json({
        success: true,
        message: {
          sid: message.sid,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
          dateUpdated: message.dateUpdated,
          to: message.to,
          from: message.from,
          body: message.body
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

export default router;
