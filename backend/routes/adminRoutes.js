import express from 'express';
import {
  getAllComplaints,
  assignComplaint,
  getAllClients,
  getAllTechnicians,
  toggleUserStatus,
  deleteUser,
  getDashboardStats,
  getComplaintById
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/roleAuth.js';

const router = express.Router();

// Dashboard
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);

// Complaint management
router.get('/complaints', authenticateAdmin, getAllComplaints);
router.get('/complaints/:id', authenticateAdmin, getComplaintById);
router.post('/complaints/assign', authenticateAdmin, assignComplaint);

// User management
router.get('/clients', authenticateAdmin, getAllClients);
router.get('/technicians', authenticateAdmin, getAllTechnicians);
router.patch('/users/:userId/toggle-status', authenticateAdmin, toggleUserStatus);
router.delete('/users/:userId', authenticateAdmin, deleteUser);

export default router;
