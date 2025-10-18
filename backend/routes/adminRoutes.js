import express from 'express';
import {
  getAllComplaints,
  assignComplaint,
  getAllClients,
  getAllTechnicians,
  toggleUserStatus,
  deleteUser,
  getDashboardStats,
  getComplaintById,
  createClient,
  createTechnician,
  updateClient,
  updateTechnician
} from '../controllers/adminController.js';
import { sendAdminOTP, verifyAdminOTP, getCurrentAdmin } from '../controllers/adminAuthController.js';
import { authenticateAdmin } from '../middleware/roleAuth.js';

const router = express.Router();

// Authentication routes - matching the pattern
router.post('/auth/send-otp', sendAdminOTP);
router.post('/auth/verify-otp', verifyAdminOTP);
router.get('/auth/me', authenticateAdmin, getCurrentAdmin);

// Dashboard
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);

// Complaint management
router.get('/complaints', authenticateAdmin, getAllComplaints);
router.get('/complaints/:id', authenticateAdmin, getComplaintById);
router.post('/complaints/assign', authenticateAdmin, assignComplaint);

// User management
router.get('/clients', authenticateAdmin, getAllClients);
router.post('/clients', authenticateAdmin, createClient);
router.put('/clients/:id', authenticateAdmin, updateClient);

router.get('/technicians', authenticateAdmin, getAllTechnicians);
router.post('/technicians', authenticateAdmin, createTechnician);
router.put('/technicians/:id', authenticateAdmin, updateTechnician);

router.patch('/users/:userId/toggle-status', authenticateAdmin, toggleUserStatus);
router.delete('/users/:userId', authenticateAdmin, deleteUser);

export default router;
