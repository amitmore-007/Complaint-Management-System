import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Try to decode with regular secret first, then admin secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      try {
        decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      } catch (adminError) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isUserActive()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive user' 
      });
    }

    // Check token expiry for non-admin users
    if (user.role !== 'admin') {
      const tokenAge = Date.now() - (decoded.iat * 1000);
      const tenDays = 10 * 24 * 60 * 60 * 1000; // 10 days in milliseconds
      
      if (tokenAge > tenDays) {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired. Please login again.' 
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin authentication failed' 
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};
