import jwt from 'jsonwebtoken';
import Technician from '../models/Technician.js';
import OTP from '../models/OTP.js';
import { sendOTP } from '../config/twilio.js';

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId) => {
  return jwt.sign({ userId, role: 'technician' }, process.env.JWT_SECRET, { expiresIn: '20d' });
};

export const sendTechnicianOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    console.log('📱 Technician OTP Request:', { phoneNumber });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const otp = generateOTP();
    console.log('🔢 Generated Technician OTP:', otp, 'for', phoneNumber);

    // Delete any existing OTP for this phone number
    await OTP.deleteMany({ phoneNumber, role: 'technician' });

    // Create new OTP record
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      role: 'technician',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await otpRecord.save();
    console.log('💾 Technician OTP saved to database');

    // Send OTP via WhatsApp
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

    console.log('🔍 Technician OTP Verification:', { phoneNumber, otp, name });

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
    let technician = await Technician.findOne({ phoneNumber });

    if (!technician) {
      // Create new technician
      const defaultName = name || `Technician-${phoneNumber.slice(-4)}`;
      technician = new Technician({
        phoneNumber,
        name: defaultName,
        isVerified: true
      });
      await technician.save();
      console.log('👤 Created new technician:', { phoneNumber, name: defaultName });
    } else {
      // Update existing technician
      technician.isVerified = true;
      technician.lastLogin = new Date();
      if (name && name !== technician.name) {
        technician.name = name;
      }
      await technician.save();
      console.log('✅ Updated existing technician');
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
