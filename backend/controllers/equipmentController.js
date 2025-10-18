import Equipment from '../models/Equipment.js';
import AssetRecord from '../models/AssetRecord.js';
import Client from '../models/Client.js';

// Get equipment list
export const getEquipmentList = async (req, res) => {
  try {
    const equipment = await Equipment.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      equipment
    });
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment list'
    });
  }
};

// Create new equipment
export const createEquipment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Equipment name is required'
      });
    }

    const trimmedName = name.trim();
    
    // Check if equipment already exists (case-insensitive)
    const existingEquipment = await Equipment.findOne({ 
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      isActive: true 
    });
    
    if (existingEquipment) {
      return res.status(400).json({
        success: false,
        message: 'Equipment with this name already exists'
      });
    }

    const equipment = new Equipment({
      name: trimmedName
    });

    await equipment.save();

    res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      equipment
    });
  } catch (error) {
    console.error('Error creating equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create equipment'
    });
  }
};

// Update equipment
export const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Check if name is being changed and if it conflicts (case-insensitive)
    if (name && name.trim() !== equipment.name) {
      const trimmedName = name.trim();
      const existingEquipment = await Equipment.findOne({ 
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        _id: { $ne: id },
        isActive: true
      });
      
      if (existingEquipment) {
        return res.status(400).json({
          success: false,
          message: 'Equipment with this name already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined && name.trim()) {
      equipment.name = name.trim();
    }
    
    if (isActive !== undefined) {
      equipment.isActive = isActive;
    }

    await equipment.save();

    res.json({
      success: true,
      message: 'Equipment updated successfully',
      equipment
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update equipment'
    });
  }
};

// Delete equipment
export const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Soft delete by setting isActive to false
    equipment.isActive = false;
    await equipment.save();

    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete equipment'
    });
  }
};

// Submit asset record
export const submitAssetRecord = async (req, res) => {
  try {
    const { storeName, equipment, notes } = req.body;
    const technicianId = req.user.id;

    const assetRecord = new AssetRecord({
      technician: technicianId,
      storeName: storeName.trim(),
      equipment,
      notes: notes?.trim()
    });

    await assetRecord.save();
    await assetRecord.populate('technician', 'name phoneNumber');

    res.status(201).json({
      success: true,
      message: 'Asset record submitted successfully',
      record: assetRecord
    });
  } catch (error) {
    console.error('Error submitting asset record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit asset record'
    });
  }
};

// Get all asset records (Admin)
export const getAssetRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, storeName, technicianId } = req.query;

    const filter = {};
    if (storeName) filter.storeName = { $regex: storeName, $options: 'i' };
    if (technicianId) filter.technician = technicianId;

    const records = await AssetRecord.find(filter)
      .populate('technician', 'name phoneNumber')
      .sort({ submissionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AssetRecord.countDocuments(filter);

    res.json({
      success: true,
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching asset records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset records'
    });
  }
};

// Get technician's own asset records
export const getTechnicianAssetRecords = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const records = await AssetRecord.find({ technician: technicianId })
      .populate('technician', 'name phoneNumber')
      .sort({ submissionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AssetRecord.countDocuments({ technician: technicianId });

    res.json({
      success: true,
      records,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching technician asset records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset records'
    });
  }
};

// Get client asset records (for client's stores)
export const getClientAssetRecords = async (req, res) => {
  try {
    const clientId = req.user.id;
    
    // For now, get all records since we don't have specific client-store mapping
    // In a real scenario, you'd filter by client's actual stores
    const records = await AssetRecord.find({})
      .populate('technician', 'name phoneNumber')
      .sort({ submissionDate: -1 });

    res.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Error fetching client asset records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset records'
    });
  }
};

// Get asset record by ID
export const getAssetRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AssetRecord.findById(id)
      .populate('technician', 'name phoneNumber');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Asset record not found'
      });
    }

    res.json({
      success: true,
      record
    });
  } catch (error) {
    console.error('Error fetching asset record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset record'
    });
  }
};
