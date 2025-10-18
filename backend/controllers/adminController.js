import Client from '../models/Client.js';
import Technician from '../models/Technician.js';
import Admin from '../models/Admin.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import { sendStatusUpdateNotification, sendAssignmentNotification } from '../config/msg91.js';

export const getAllComplaints = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('client', 'name phoneNumber')
      .populate('assignedTechnician', 'name phoneNumber')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const assignComplaint = async (req, res) => {
  try {
    const { complaintId, technicianId } = req.body;
    const adminId = req.user.id;

    if (!complaintId || !technicianId) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID and Technician ID are required'
      });
    }

    // Verify technician exists and is active
    const technician = await Technician.findOne({ 
      _id: technicianId, 
      isActive: true 
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found or inactive'
      });
    }

    // Find complaint with client information
    const complaint = await Complaint.findById(complaintId).populate('client', 'name phoneNumber');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (complaint.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Complaint is already assigned or completed'
      });
    }

    // Assign complaint
    complaint.assignedTechnician = technicianId;
    complaint.assignedBy = adminId;
    complaint.assignedAt = new Date();
    complaint.status = 'assigned';

    await complaint.save();

    // Send WhatsApp notification to client with improved error handling
    if (complaint.client && complaint.client.phoneNumber) {
      const notification = new Notification({
        complaint: complaint._id,
        recipient: complaint.client.phoneNumber,
        type: 'assignment',
        message: `Complaint ${complaint.complaintId} assigned to ${technician.name}`
      });

      try {
        const result = await sendAssignmentNotification(
          complaint.client.phoneNumber,
          technician.name,
          complaint.complaintId, // Use complaintId instead of _id
          complaint.client.name   // Add client name parameter
        );
        
        if (result.success) {
          notification.status = 'sent';
          notification.twilioMessageId = result.messageId;
          notification.sentAt = new Date();
        } else {
          notification.status = 'failed';
          notification.error = result.error;
          console.error('❌ Failed to send assignment notification:', result.error);
        }
      } catch (notificationError) {
        notification.status = 'failed';
        notification.error = notificationError.message;
        console.error('❌ Assignment notification error:', notificationError);
      }

      await notification.save();
    } else {
      console.log('⚠️ Skipping assignment notification - client or phone number not found');
    }

    // Populate the complaint for response
    await complaint.populate([
      { path: 'client', select: 'name phoneNumber' },
      { path: 'assignedTechnician', select: 'name phoneNumber' },
      { path: 'assignedBy', select: 'name' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const autoAssignPendingComplaints = async () => {
  try {
    // Get all pending complaints
    const pendingComplaints = await Complaint.find({ status: 'pending' })
      .populate('client', 'phoneNumber')
      .sort({ createdAt: 1 }); // Oldest first

    if (pendingComplaints.length === 0) {
      return;
    }

    // Get active technicians
    const technicians = await Technician.find({ 
      isActive: true 
    }).sort({ _id: 1 });

    if (technicians.length === 0) {
      console.log('No active technicians available for auto-assignment');
      return;
    }

    // Get technician with least assignments (round-robin approach)
    const technicianAssignments = await Promise.all(
      technicians.map(async (tech) => {
        const count = await Complaint.countDocuments({
          assignedTechnician: tech._id,
          status: { $in: ['assigned', 'in-progress'] }
        });
        return { technician: tech, assignmentCount: count };
      })
    );

    // Sort by assignment count (ascending)
    technicianAssignments.sort((a, b) => a.assignmentCount - b.assignmentCount);

    // Assign complaints in round-robin fashion
    for (let i = 0; i < pendingComplaints.length; i++) {
      const complaint = pendingComplaints[i];
      const techIndex = i % technicianAssignments.length;
      const selectedTech = technicianAssignments[techIndex].technician;

      complaint.assignedTechnician = selectedTech._id;
      complaint.assignedAt = new Date();
      complaint.status = 'assigned';

      await complaint.save();

      // Send notification
      await sendAssignmentNotification(
        complaint.client.phoneNumber,
        selectedTech.name,
        complaint.complaintId
      );
    }
  } catch (error) {
    console.error('Auto-assign error:', error);
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate('client', 'name phoneNumber')
      .populate('assignedTechnician', 'name phoneNumber')
      .populate('assignedBy', 'name');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Get complaint by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(filter)
      .select('name phoneNumber isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Client.countDocuments(filter);

    // Get complaint counts for each client
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const complaintCount = await Complaint.countDocuments({ client: client._id });
        return {
          ...client.toObject(),
          complaintCount
        };
      })
    );

    res.status(200).json({
      success: true,
      clients: clientsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAllTechnicians = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const technicians = await Technician.find(filter)
      .select('name phoneNumber isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Technician.countDocuments(filter);

    // Get assignment stats for each technician (allow multiple assignments)
    const techniciansWithStats = await Promise.all(
      technicians.map(async (tech) => {
        const activeAssignments = await Complaint.countDocuments({
          assignedTechnician: tech._id,
          status: { $in: ['assigned', 'in-progress'] }
        });
        const completedAssignments = await Complaint.countDocuments({
          assignedTechnician: tech._id,
          status: 'resolved'
        });
        const totalAssignments = await Complaint.countDocuments({
          assignedTechnician: tech._id
        });
        return {
          ...tech.toObject(),
          activeAssignments,
          completedAssignments,
          totalAssignments
        };
      })
    );

    res.status(200).json({
      success: true,
      technicians: techniciansWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all technicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Try to find user in both Client and Technician models
    let user = await Client.findById(userId);
    let userType = 'client';

    if (!user) {
      user = await Technician.findById(userId);
      userType = 'technician';
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: userType,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to find user in both Client and Technician models
    let user = await Client.findById(userId);
    let userType = 'client';
    let Model = Client;

    if (!user) {
      user = await Technician.findById(userId);
      userType = 'technician';
      Model = Technician;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has active complaints/assignments
    if (userType === 'client') {
      const activeComplaints = await Complaint.countDocuments({
        client: userId,
        status: { $in: ['pending', 'assigned', 'in-progress'] }
      });

      if (activeComplaints > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete client with active complaints'
        });
      }
    } else if (userType === 'technician') {
      const activeAssignments = await Complaint.countDocuments({
        assignedTechnician: userId,
        status: { $in: ['assigned', 'in-progress'] }
      });

      if (activeAssignments > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete technician with active assignments'
        });
      }
    }

    await Model.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'in-progress' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    
    const totalClients = await Client.countDocuments();
    const totalTechnicians = await Technician.countDocuments();
    const activeTechnicians = await Technician.countDocuments({ isActive: true });

    // Recent complaints
    const recentComplaints = await Complaint.find()
      .populate('client', 'name phoneNumber')
      .populate('assignedTechnician', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        totalClients,
        totalTechnicians,
        activeTechnicians,
        recentComplaints
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If starts with 91, remove it (assuming it's India +91)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }
  
  // Should be exactly 10 digits
  if (cleaned.length === 10) {
    return cleaned;
  }
  
  return phoneNumber; // Return original if can't normalize
};

// Create new client
export const createClient = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const adminId = req.user.id;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required'
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if client already exists
    const existingClient = await Client.findOne({ phoneNumber: normalizedPhone });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this phone number already exists'
      });
    }

    const client = new Client({
      name: name.trim(),
      phoneNumber: normalizedPhone,
      isVerified: true,
      isActive: true
    });

    await client.save();

    // Update admin's created clients list
    await Admin.findByIdAndUpdate(adminId, {
      $push: { createdClients: client._id }
    });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: {
        id: client._id,
        name: client.name,
        phoneNumber: client.phoneNumber,
        isActive: client.isActive,
        createdAt: client.createdAt
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new technician
export const createTechnician = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const adminId = req.user.id;

    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required'
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if technician already exists
    const existingTechnician = await Technician.findOne({ phoneNumber: normalizedPhone });
    if (existingTechnician) {
      return res.status(400).json({
        success: false,
        message: 'Technician with this phone number already exists'
      });
    }

    const technician = new Technician({
      name: name.trim(),
      phoneNumber: normalizedPhone,
      isVerified: true,
      isActive: true
    });

    await technician.save();

    // Update admin's created technicians list
    await Admin.findByIdAndUpdate(adminId, {
      $push: { createdTechnicians: technician._id }
    });

    res.status(201).json({
      success: true,
      message: 'Technician created successfully',
      technician: {
        id: technician._id,
        name: technician.name,
        phoneNumber: technician.phoneNumber,
        isActive: technician.isActive,
        createdAt: technician.createdAt
      }
    });
  } catch (error) {
    console.error('Create technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update client
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber } = req.body;

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Normalize phone number if provided
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

    // Check if phone number is being changed and if it conflicts
    if (normalizedPhone && normalizedPhone !== client.phoneNumber) {
      const existingClient = await Client.findOne({ 
        phoneNumber: normalizedPhone, 
        _id: { $ne: id } 
      });
      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use by another client'
        });
      }
    }

    if (name) client.name = name.trim();
    if (normalizedPhone) client.phoneNumber = normalizedPhone;

    await client.save();

    res.json({
      success: true,
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update technician
export const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber } = req.body;

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    // Normalize phone number if provided
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

    // Check if phone number is being changed and if it conflicts
    if (normalizedPhone && normalizedPhone !== technician.phoneNumber) {
      const existingTechnician = await Technician.findOne({ 
        phoneNumber: normalizedPhone, 
        _id: { $ne: id } 
      });
      if (existingTechnician) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use by another technician'
        });
      }
    }

    if (name) technician.name = name.trim();
    if (normalizedPhone) technician.phoneNumber = normalizedPhone;

    await technician.save();

    res.json({
      success: true,
      message: 'Technician updated successfully',
      technician
    });
  } catch (error) {
    console.error('Update technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
