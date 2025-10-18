import jwt from 'jsonwebtoken';
import Client from '../models/Client.js';
import OTP from '../models/OTP.js';
import { sendOTP } from '../config/msg91.js';

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId) => {
  return jwt.sign({ userId, role: 'client' }, process.env.JWT_SECRET, { expiresIn: '20d' });
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

export const sendClientOTP = async (req, res) => {
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
    // Check if client exists in database (admin-created)
    const existingClient = await Client.findOne({ phoneNumber: normalizedPhone });
    if (!existingClient) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Please contact admin to create your account.'
      });
    }

    const otp = generateOTP();

    // Delete any existing OTP for this phone number and role
    await OTP.deleteMany({ phoneNumber: normalizedPhone, role: 'client' });

    // Create new OTP record
    const otpRecord = new OTP({
      phoneNumber: normalizedPhone,
      otp,
      role: 'client',
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
    console.error('Send Client OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyClientOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and name are required'
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phoneNumber: normalizedPhone,
      otp,
      role: 'client',
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

    // Look for existing client
    let client = await Client.findOne({ phoneNumber: normalizedPhone });
    if (!client) {
      return res.status(403).json({
        success: false,
        message: 'Client not found. Please contact admin.'
      });
    } else {
      // Update existing client
      client.isVerified = true;
      client.lastLogin = new Date();
      if (name !== client.name) {
        client.name = name;
      }
      await client.save();
    }

    // Generate JWT token
    const token = generateToken(client._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: client._id,
        phoneNumber: client.phoneNumber,
        name: client.name,
        role: 'client',
        isActive: client.isActive
      }
    });
  } catch (error) {
    console.error('Verify Client OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getCurrentClient = async (req, res) => {
  try {
    const client = await Client.findById(req.user.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: client._id,
        phoneNumber: client.phoneNumber,
        name: client.name,
        role: 'client',
        isActive: client.isActive,
        lastLogin: client.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current client error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
