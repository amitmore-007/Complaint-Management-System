import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import OTP from '../models/OTP.js';
import { sendOTP } from '../config/msg91.js';

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId) => {
  return jwt.sign({ userId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '999y' }); // Admin never expires
};

export const sendAdminOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const otp = generateOTP();

    // Delete any existing OTP for this phone number
    await OTP.deleteMany({ phoneNumber, role: 'admin' });

    // Create new OTP record
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      role: 'admin',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
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
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send Admin OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyAdminOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phoneNumber,
      otp,
      role: 'admin',
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

    // Look for existing admin
    let admin = await Admin.findOne({ phoneNumber });

    if (!admin) {
      // Create new admin
      const defaultName = name || `Admin-${phoneNumber.slice(-4)}`;
      admin = new Admin({
        phoneNumber,
        name: defaultName,
        isVerified: true
      });
      await admin.save();
    } else {
      // Update existing admin
      admin.isVerified = true;
      admin.lastLogin = new Date();
      if (name && name !== admin.name) {
        admin.name = name;
      }
      await admin.save();
    }

    // Generate JWT token
    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        phoneNumber: admin.phoneNumber,
        name: admin.name,
        role: 'admin',
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Verify Admin OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getCurrentAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: admin._id,
        phoneNumber: admin.phoneNumber,
        name: admin.name,
        role: 'admin',
        isActive: admin.isActive,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Get current admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
