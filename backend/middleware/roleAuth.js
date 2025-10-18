import jwt from 'jsonwebtoken';

const authenticateRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access token required' 
        });
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid or expired token' 
        });
      }

      // Check if token role matches required role
      if (decoded.role !== requiredRole) {
        return res.status(403).json({ 
          success: false, 
          message: `${requiredRole} access required` 
        });
      }

      // Find user based on role
      let user;
      const { userId, role } = decoded;

      if (role === 'admin') {
        const Admin = (await import('../models/Admin.js')).default;
        user = await Admin.findById(userId);
      } else if (role === 'client') {
        const Client = (await import('../models/Client.js')).default;
        user = await Client.findById(userId);
      } else if (role === 'technician') {
        const Technician = (await import('../models/Technician.js')).default;
        user = await Technician.findById(userId);
      }

      if (!user || !user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid or inactive user' 
        });
      }

      req.user = { id: user._id, role, ...user.toObject() };
      next();
    } catch (error) {
      console.error('Role auth middleware error:', error);
      return res.status(403).json({ 
        success: false, 
        message: 'Authentication failed' 
      });
    }
  };
};

export const authenticateClient = authenticateRole('client');
export const authenticateTechnician = authenticateRole('technician');
export const authenticateAdmin = authenticateRole('admin');

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

