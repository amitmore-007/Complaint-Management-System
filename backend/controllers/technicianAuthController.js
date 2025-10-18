import jwt from 'jsonwebtoken';
import Technician from '../models/Technician.js';
import OTP from '../models/OTP.js';
import { sendOTP } from '../config/msg91.js';

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId) => {
  return jwt.sign({ userId, role: 'technician' }, process.env.JWT_SECRET, { expiresIn: '20d' });
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

export const sendTechnicianOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Normalize phone number for database lookup
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Check if technician exists in database (admin-created)
    const existingTechnician = await Technician.findOne({ phoneNumber: normalizedPhone });
    if (!existingTechnician) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Please contact admin to create your account.'
      });
    }

    const otp = generateOTP();

    // Delete any existing OTP for this phone number
    await OTP.deleteMany({ phoneNumber: normalizedPhone, role: 'technician' });

    // Create new OTP record
    const otpRecord = new OTP({
      phoneNumber: normalizedPhone,
      otp,
      role: 'technician',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await otpRecord.save();

    // Send OTP via MSG91 WhatsApp (use +91 format for sending)
    const result = await sendOTP(`+91${normalizedPhone}`, otp);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to WhatsApp',
        messageId: result.messageId
      });
    } else {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send Technician OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyTechnicianOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phoneNumber: normalizedPhone,
      otp,
      role: 'technician',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Look for existing technician
    let technician = await Technician.findOne({ phoneNumber: normalizedPhone });

    if (!technician) {
      // Create new technician
      const defaultName = name || `Technician-${phoneNumber.slice(-4)}`;
      technician = new Technician({
        phoneNumber,
        name: defaultName,
        isVerified: true
      });
      await technician.save();

    } else {
      // Update existing technician
      technician.isVerified = true;
      technician.lastLogin = new Date();
      if (name && name !== technician.name) {
        technician.name = name;
      }
      await technician.save();
    }

    // Generate JWT token
    const token = generateToken(technician._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: technician._id,
        phoneNumber: technician.phoneNumber,
        name: technician.name,
        role: 'technician',
        isActive: technician.isActive
      }
    });
  } catch (error) {
    console.error('Verify Technician OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCurrentTechnician = async (req, res) => {
  try {
    const technician = await Technician.findById(req.user.id);
    
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: technician._id,
        phoneNumber: technician.phoneNumber,
        name: technician.name,
        role: 'technician',
        isActive: technician.isActive,
        lastLogin: technician.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current technician error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
