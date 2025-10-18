import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { sendOTP } from '../config/msg91.js';

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT Token
const generateToken = (userId, role) => {
  const secret = role === 'admin' ? process.env.JWT_ADMIN_SECRET : process.env.JWT_SECRET;
  const expiresIn = role === 'admin' ? '365d' : '10d';
  
  return jwt.sign({ userId, role }, secret, { expiresIn });
};

export const sendOTPController = async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;

    if (!phoneNumber || !role) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and role are required'
      });
    }

    if (!['client', 'technician', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const otp = generateOTP();

    // Delete any existing OTP for this phone number and role
    const deletedCount = await OTP.deleteMany({ phoneNumber, role });
    console.log('🗑️ Deleted existing OTPs:', deletedCount.deletedCount);

    // Create new OTP record
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      role,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    });

    await otpRecord.save();

    // Send OTP via MSG91 WhatsApp
    const result = await sendOTP(phoneNumber, otp);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to WhatsApp',
        messageId: result.messageId
      });
    } else {
      // Delete the OTP record if sending failed
      await OTP.deleteOne({ _id: otpRecord._id });
      
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyOTPController = async (req, res) => {
  try {
    const { phoneNumber, otp, role, name } = req.body;

    if (!phoneNumber || !otp || !role) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and role are required'
      });
    }

    // Debug: Check all OTPs for this phone and role
    const allOTPs = await OTP.find({ phoneNumber, role }).sort({ createdAt: -1 });
    console.log('📋 All OTPs for', phoneNumber, role, ':', allOTPs.map(o => ({
      otp: o.otp,
      isUsed: o.isUsed,
      expiresAt: o.expiresAt,
      isExpired: o.expiresAt < new Date(),
      createdAt: o.createdAt
    })));

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phoneNumber,
      otp,
      role,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    console.log('🎯 Found OTP record:', otpRecord ? {
      id: otpRecord._id,
      otp: otpRecord.otp,
      isUsed: otpRecord.isUsed,
      expiresAt: otpRecord.expiresAt,
      isExpired: otpRecord.expiresAt < new Date()
    } : 'No valid OTP found');

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    console.log('✅ OTP marked as used');

    // Look for existing user with this phone number and role combination
    let user = await User.findOne({ phoneNumber, role });
    console.log('👤 User with phone and role:', user ? `Found: ${user.name}` : 'Not found');

    if (!user) {
      // Check if user exists with same phone but different role
      const existingUserWithDifferentRole = await User.findOne({ phoneNumber });
      
      if (existingUserWithDifferentRole) {
        console.log(`📧 Found existing user with different role: ${existingUserWithDifferentRole.role}`);
        
        // Don't update existing user, create new user for this role
        if (role === 'client' && !name) {
          return res.status(400).json({
            success: false,
            message: 'Name is required for new clients'
          });
        }

        // Generate role-specific default name
        const defaultName = name || (role === 'technician' ? 'Technician' : role === 'admin' ? 'Admin' : 'User');

        try {
          user = new User({
            phoneNumber,
            name: defaultName,
            role,
            isVerified: true
          });
          
          await user.save();
          console.log('👤 Created new user for different role:', { phoneNumber, name: defaultName, role });
        } catch (createError) {
          console.error('Error creating new user:', createError);
          
          // If still getting duplicate key error, it means a user was created between our checks
          if (createError.code === 11000) {
            user = await User.findOne({ phoneNumber, role });
            if (user) {
              user.isVerified = true;
              user.lastLogin = new Date();
              await user.save();
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      } else {
        // No existing user with this phone number
        if (role === 'client' && !name) {
          return res.status(400).json({
            success: false,
            message: 'Name is required for new clients'
          });
        }

        const defaultName = name || (role === 'technician' ? 'Technician' : role === 'admin' ? 'Admin' : 'User');

        try {
          user = new User({
            phoneNumber,
            name: defaultName,
            role,
            isVerified: true
          });
          
          await user.save();
          console.log('👤 Created first user:', { phoneNumber, name: defaultName, role });
        } catch (createError) {
          console.error('Error creating first user:', createError);
          throw createError;
        }
      }
    } else {
      // User exists with same phone and role - just update login info
      user.isVerified = true;
      user.lastLogin = new Date();
      
      // Only update name if provided and different
      if (name && name !== user.name) {
        user.name = name;
      }
      
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
