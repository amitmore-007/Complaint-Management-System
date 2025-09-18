import jwt from 'jsonwebtoken';
import Client from '../models/Client.js';
import Technician from '../models/Technician.js';
import Admin from '../models/Admin.js';

export const authenticateClient = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔑 Client auth - Token present:', !!token);

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔓 Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    if (decoded.role !== 'client') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token for client access' 
      });
    }

    const client = await Client.findById(decoded.userId);
    console.log('👤 Client found:', client ? 'Yes' : 'No');

    if (!client || !client.isUserActive()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive client' 
      });
    }

    // Ensure consistent user object structure
    req.user = { 
      ...client.toObject(), 
      id: client._id.toString(), // Ensure string ID
      _id: client._id,
      role: 'client' 
    };
    console.log('✅ Client authenticated:', req.user.id);
    next();
  } catch (error) {
    console.error('Client auth middleware error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

export const authenticateTechnician = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔑 Technician auth - Token present:', !!token);

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔓 Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    if (decoded.role !== 'technician') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token for technician access' 
      });
    }

    const technician = await Technician.findById(decoded.userId);
    console.log('👤 Technician found:', technician ? 'Yes' : 'No');

    if (!technician || !technician.isUserActive()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive technician' 
      });
    }

    // Ensure consistent user object structure
    req.user = { 
      ...technician.toObject(), 
      id: technician._id.toString(), // Ensure string ID
      _id: technician._id,
      role: 'technician' 
    };
    console.log('✅ Technician authenticated:', req.user.id);
    next();
  } catch (error) {
    console.error('Technician auth middleware error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔑 Admin auth - Token present:', !!token);

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    console.log('🔓 Token decoded:', { userId: decoded.userId, role: decoded.role });
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token for admin access' 
      });
    }

    const admin = await Admin.findById(decoded.userId);
    console.log('👤 Admin found:', admin ? 'Yes' : 'No');

    if (!admin || !admin.isUserActive()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive admin' 
      });
    }

    // Ensure consistent user object structure
    req.user = { 
      ...admin.toObject(), 
      id: admin._id.toString(), // Ensure string ID
      _id: admin._id,
      role: 'admin' 
    };
    console.log('✅ Admin authenticated:', req.user.id);
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};
