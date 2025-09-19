import Complaint from '../models/Complaint.js';
import Client from '../models/Client.js';
import Technician from '../models/Technician.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import { sendAssignmentNotification, sendProgressUpdate, sendStatusUpdateNotification } from '../config/twilio.js';
import fs from 'fs';

export const createComplaint = async (req, res) => {
  try {
    const { title, description, location, priority } = req.body;
    const clientId = req.user.id;

    console.log('Creating complaint for client:', clientId);
    console.log('Client user object:', req.user);

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and location are required'
      });
    }

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    console.log('Verified client:', client.name, client.phoneNumber);

    // Generate unique complaint ID
    const generateComplaintId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `CMP-${timestamp}-${random}`.toUpperCase();
    };

    // Handle photo uploads
    let photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await uploadToCloudinary(file);
          photos.push(uploadResult);
          
          // Delete local file after upload
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Photo upload error:', error);
          // Clean up any uploaded photos if one fails
          for (const photo of photos) {
            await deleteFromCloudinary(photo.publicId);
          }
          return res.status(500).json({
            success: false,
            message: 'Failed to upload photos'
          });
        }
      }
    }

    const complaint = new Complaint({
      complaintId: generateComplaintId(),
      title,
      description,
      location,
      priority: priority || 'medium',
      photos,
      client: clientId
    });

    await complaint.save();
    console.log('Complaint created successfully:', complaint._id);

    // Populate client info for response
    await complaint.populate('client', 'name phoneNumber');

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully',
      complaint
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    console.log('Fetching complaints for client:', userId);

    const filter = { client: userId };
    if (status) {
      filter.status = status;
    }

    const complaints = await Complaint.find(filter)
      .populate('assignedTechnician', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    console.log('Found complaints:', complaints.length);

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
    console.error('Get my complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, priority, removedPhotos } = req.body;
    const userId = req.user.id;

    const complaint = await Complaint.findOne({ _id: id, client: userId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found or unauthorized'
      });
    }

    // Only allow updates if complaint is still pending
    if (complaint.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update complaint after it has been assigned'
      });
    }

    // Update basic fields
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (location) complaint.location = location;
    if (priority) complaint.priority = priority;

    // Handle photo removals
    if (removedPhotos && removedPhotos.length > 0) {
      const removedPhotoIds = Array.isArray(removedPhotos) ? removedPhotos : [removedPhotos];
      
      // Remove photos from Cloudinary
      for (const publicId of removedPhotoIds) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (error) {
          console.error('Error deleting photo from Cloudinary:', error);
        }
      }
      
      // Remove photos from complaint
      complaint.photos = complaint.photos.filter(
        photo => !removedPhotoIds.includes(photo.publicId)
      );
    }

    // Handle new photo uploads
    if (req.files && req.files.length > 0) {
      // Check if adding new photos would exceed the limit
      if (complaint.photos.length + req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 photos allowed per complaint'
        });
      }

      for (const file of req.files) {
        try {
          const uploadResult = await uploadToCloudinary(file);
          complaint.photos.push(uploadResult);
          
          // Delete local file after upload
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Photo upload error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload new photos'
          });
        }
      }
    }

    await complaint.save();

    // Populate the complaint before sending response
    await complaint.populate('client', 'name phoneNumber');

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const complaint = await Complaint.findOne({ _id: id, client: userId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found or unauthorized'
      });
    }

    // Only allow deletion if complaint is still pending
    if (complaint.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete complaint after it has been assigned'
      });
    }

    // Delete photos from Cloudinary
    for (const photo of complaint.photos) {
      await deleteFromCloudinary(photo.publicId);
    }

    await Complaint.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Technician-specific controllers
export const getAssignedComplaints = async (req, res) => {
  try {
    const technicianId = req.user.id;
    
    console.log('🔍 Fetching assignments for technician:', technicianId);

    // Find complaints assigned to this technician
    const complaints = await Complaint.find({
      assignedTechnician: technicianId,
      status: { $in: ['assigned', 'in-progress'] } // Only active assignments
    })
    .populate('client', 'name phoneNumber')
    .populate('assignedBy', 'name')
    .sort({ assignedAt: -1 });

    console.log('📋 Found complaints:', complaints.length);

    // Calculate stats
    const stats = {
      total: complaints.length,
      assigned: complaints.filter(c => c.status === 'assigned').length,
      inProgress: complaints.filter(c => c.status === 'in-progress').length,
      completed: 0 // Will be calculated separately if needed
    };

    // Get completed count for stats
    const completedCount = await Complaint.countDocuments({
      assignedTechnician: technicianId,
      status: 'resolved'
    });
    stats.completed = completedCount;
    stats.total = complaints.length + completedCount;

    res.status(200).json({
      success: true,
      data: {
        complaints,
        stats
      }
    });
  } catch (error) {
    console.error('Get assigned complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const technicianId = req.user.id;

    console.log('🔄 Updating complaint status:', { id, status, notes, technicianId });

    // Find complaint assigned to this technician with client info
    const complaint = await Complaint.findOne({
      _id: id,
      assignedTechnician: technicianId
    }).populate('client', 'name phoneNumber');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found or not assigned to you'
      });
    }

    // Validate status transition
    const validTransitions = {
      'assigned': ['in-progress'],
      'in-progress': ['resolved']
    };

    if (!validTransitions[complaint.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${complaint.status} to ${status}`
      });
    }

    // Update complaint
    const oldStatus = complaint.status;
    complaint.status = status;
    if (notes) {
      complaint.technicianNotes = notes;
    }
    
    if (status === 'in-progress') {
      complaint.startedAt = new Date();
    } else if (status === 'resolved') {
      complaint.completedAt = new Date();
    }

    await complaint.save();

    // Send WhatsApp notification to client
    if (complaint.client && complaint.client.phoneNumber) {
      const notification = new Notification({
        complaint: complaint._id,
        recipient: complaint.client.phoneNumber,
        type: 'status_update',
        message: `Complaint ${complaint.complaintId} status updated to ${status}`
      });

      try {
        console.log('📱 Sending status update notification to client:', complaint.client.phoneNumber);
        
        const result = await sendStatusUpdateNotification(
          complaint.client.phoneNumber,
          complaint.complaintId,
          status,
          complaint.client.name
        );
        
        if (result.success) {
          notification.status = 'sent';
          notification.twilioMessageId = result.messageId;
          notification.sentAt = new Date();
          console.log('✅ Status update notification sent successfully');
        } else {
          notification.status = 'failed';
          notification.error = result.error;
          console.error('❌ Failed to send status update notification:', result.error);
        }
      } catch (notificationError) {
        notification.status = 'failed';
        notification.error = notificationError.message;
        console.error('❌ Notification error:', notificationError);
      }

      await notification.save();
    } else {
      console.log('⚠️ Skipping notification - client or phone number not found');
    }

    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = { _id: id };
    
    // Clients can only see their own complaints
    if (userRole === 'client') {
      filter.client = userId;
    }
    // Technicians can only see assigned complaints
    else if (userRole === 'technician') {
      filter.assignedTechnician = userId;
    }

    const complaint = await Complaint.findOne(filter)
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
