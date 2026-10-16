import { userData } from "../data/userData.js";
import { otpData } from "../data/otpData.js";
import { sendOTP } from "../config/msg91.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { generateAuthToken, generateOTP } from "../utils/authToken.js";
import { createHttpError } from "../utils/httpError.js";
import { canViewSmartDevices } from "./smartDeviceService.js";

const OTP_TTL_MS = 10 * 60 * 1000;

export const ROLES = ["admin", "client", "technician"];

/**
 * The only genuine behavioural differences between the three former per-role
 * auth controllers. Everything else was a copy-paste of the same 70 lines.
 */
const ROLE_CONFIG = {
  // Admins self-provision on first successful verify; client and technician
  // accounts must be created by an admin first.
  admin: { autoCreate: true },
  client: {
    autoCreate: false,
    missingMessage: "Client not found. Please contact admin.",
  },
  technician: {
    autoCreate: false,
    missingMessage: "Technician not found. Please contact admin.",
  },
};

const requireRole = (role) => {
  if (!ROLES.includes(role)) {
    throw createHttpError(400, "A valid role is required");
  }
  return role;
};

const publicUser = (user) => ({
  id: user._id,
  phoneNumber: user.phoneNumber,
  name: user.name,
  role: user.role,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  canViewSmartDevices: canViewSmartDevices(user),
});

export const authService = {
  sendOtp: async ({ role, phoneNumber }) => {
    requireRole(role);
    if (!phoneNumber) throw createHttpError(400, "Phone number is required");

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Non-admin roles must already have an admin-created account.
    if (!ROLE_CONFIG[role].autoCreate) {
      const existing = await userData.findByPhoneAndRole({
        phoneNumber: normalizedPhone,
        role,
      });
      if (!existing) {
        throw createHttpError(
          403,
          "Access denied. Please contact admin to create your account.",
        );
      }
    }

    const otp = generateOTP();

    // Issuing a new code invalidates any previous one for this phone+role.
    await otpData.deleteForPhoneAndRole({ phoneNumber: normalizedPhone, role });

    const otpRecord = await otpData.create({
      phoneNumber: normalizedPhone,
      otp,
      role,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    const result = await sendOTP(`+91${normalizedPhone}`, otp);

    if (!result.success) {
      // Never leave an unusable code behind when delivery failed.
      await otpData.deleteById(otpRecord._id);
      throw createHttpError(500, "Failed to send OTP. Please try again.");
    }

    return { messageId: result.messageId };
  },

  verifyOtp: async ({ role, phoneNumber, otp, name }) => {
    requireRole(role);
    if (!phoneNumber || !otp) {
      throw createHttpError(400, "Phone number and OTP are required");
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const otpRecord = await otpData.findValid({
      phoneNumber: normalizedPhone,
      otp,
      role,
    });
    if (!otpRecord) throw createHttpError(400, "Invalid or expired OTP");

    otpRecord.isUsed = true;
    await otpData.save(otpRecord);

    let user = await userData.findByPhoneAndRole({
      phoneNumber: normalizedPhone,
      role,
    });

    if (!user) {
      if (!ROLE_CONFIG[role].autoCreate) {
        throw createHttpError(403, ROLE_CONFIG[role].missingMessage);
      }

      user = await userData.create({
        phoneNumber: normalizedPhone,
        name: name || `Admin-${normalizedPhone.slice(-4)}`,
        role,
        isVerified: true,
      });
    } else {
      user.isVerified = true;
      user.lastLogin = new Date();
      if (name && name !== user.name) user.name = name;
      await userData.save(user);
    }

    if (!user.isActive) {
      throw createHttpError(
        403,
        "Your account is inactive. Please contact admin.",
      );
    }

    return {
      token: generateAuthToken({
        userId: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
      }),
      user: publicUser(user),
    };
  },

  getMe: async (userId) => {
    const user = await userData.findById(userId);
    if (!user) throw createHttpError(404, "User not found");

    return publicUser(user);
  },

  /** Bumping tokenVersion invalidates every previously issued token. */
  logoutAllDevices: async (userId) => {
    const user = await userData.findById(userId);
    if (!user) throw createHttpError(404, "User not found");

    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await userData.save(user);

    return generateAuthToken({
      userId: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
  },
};
