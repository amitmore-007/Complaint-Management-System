import jwt from "jsonwebtoken";
import Client from "../models/Client.js";
import OTP from "../models/OTP.js";
import { sendOTP } from "../config/msg91.js";

// ============================================
// HELPER FUNCTIONS
// ============================================

// generate 6-digit otp
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// generate jwt token for client
const generateToken = (userId) => {
  return jwt.sign({ userId, role: "client" }, process.env.JWT_SECRET, {
    expiresIn: "20d",
  });
};

// normalize phone number (remove +91, keep only 10 digits)
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  let cleaned = phoneNumber.replace(/\D/g, "");

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.length === 10) {
    return cleaned;
  }

  return phoneNumber;
};

// ============================================
// AUTHENTICATION CONTROLLERS
// ============================================

// send otp to client's whatsapp
export const sendClientOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // check if client exists (admin-created accounts only)
    const existingClient = await Client.findOne({
      phoneNumber: normalizedPhone,
    });
    if (!existingClient) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Please contact admin to create your account.",
      });
    }

    const otp = generateOTP();

    // delete any existing otp for this phone number
    await OTP.deleteMany({ phoneNumber: normalizedPhone, role: "client" });

    // create new otp record
    const otpRecord = new OTP({
      phoneNumber: normalizedPhone,
      otp,
      role: "client",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await otpRecord.save();

    // send otp via whatsapp
    const result = await sendOTP(`+91${normalizedPhone}`, otp);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to WhatsApp",
        messageId: result.messageId,
      });
    } else {
      await OTP.deleteOne({ _id: otpRecord._id });
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Send Client OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// verify otp and login client
export const verifyClientOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // find valid otp
    const otpRecord = await OTP.findOne({
      phoneNumber: normalizedPhone,
      otp,
      role: "client",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // mark otp as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // find existing client
    let client = await Client.findOne({ phoneNumber: normalizedPhone });
    if (!client) {
      return res.status(403).json({
        success: false,
        message: "Client not found. Please contact admin.",
      });
    }

    // update client info
    client.isVerified = true;
    client.lastLogin = new Date();
    if (name && name !== client.name) {
      client.name = name;
    }
    await client.save();

    // generate jwt token
    const token = generateToken(client._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: client._id,
        phoneNumber: client.phoneNumber,
        name: client.name,
        role: "client",
        isActive: client.isActive,
      },
    });
  } catch (error) {
    console.error("Verify Client OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// get current logged in client
export const getCurrentClient = async (req, res) => {
  try {
    const client = await Client.findById(req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: client._id,
        phoneNumber: client.phoneNumber,
        name: client.name,
        role: "client",
        isActive: client.isActive,
        lastLogin: client.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get current client error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
