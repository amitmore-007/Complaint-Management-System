import jwt from 'jsonwebtoken';
import Client from '../models/Client.js';
import OTP from '../models/OTP.js';
import { sendOTP } from '../config/twilio.js';

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId) => {
  return jwt.sign({ userId, role: 'client' }, process.env.JWT_SECRET, { expiresIn: '20d' });
};

export const sendClientOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    console.log('📱 Client OTP Request:', { phoneNumber });

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const otp = generateOTP();
    console.log('🔢 Generated Client OTP:', otp, 'for', phoneNumber);

    // Delete any existing OTP for this phone number and role
    await OTP.deleteMany({ phoneNumber, role: 'client' });

    // Create new OTP record
    const otpRecord = new OTP({
      phoneNumber,
      otp,
      role: 'client',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await otpRecord.save();
    console.log('💾 Client OTP saved to database');

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

    console.log('🔍 Client OTP Verification:', { phoneNumber, otp, name });

    if (!phoneNumber || !otp || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and name are required'
      });
    }

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phoneNumber,
      otp,
      role: 'client',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    console.log('🎯 Found OTP record:', otpRecord ? 'Yes' : 'No');

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
    let client = await Client.findOne({ phoneNumber });
    console.log('👤 Existing client found:', client ? 'Yes' : 'No');

    if (!client) {
      // Create new client
      client = new Client({
        phoneNumber,
        name,
        isVerified: true
      });
      await client.save();
      console.log('✅ Created new client:', client._id);
    } else {
      // Update existing client
      client.isVerified = true;
      client.lastLogin = new Date();
      if (name !== client.name) {
        client.name = name;
      }
      await client.save();
      console.log('✅ Updated existing client:', client._id);
    }

    // Verify client was saved
    const savedClient = await Client.findById(client._id);
    console.log('📋 Client saved verification:', savedClient ? 'Success' : 'Failed');

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
