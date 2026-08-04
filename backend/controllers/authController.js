import { authService, ROLES } from "../services/authService.js";
import { respondWithError } from "../utils/httpError.js";

/**
 * HTTP only. Business rules live in services/authService.js; database access in
 * data/userData.js and data/otpData.js.
 */

// Role arrives from the route mount or the request body.
const resolveRole = (req) => {
  const role = req.authRole ?? req.body?.role;
  return ROLES.includes(role) ? role : null;
};

// POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
  try {
    const { messageId } = await authService.sendOtp({
      role: resolveRole(req),
      phoneNumber: req.body.phoneNumber,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to WhatsApp",
      messageId,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { token, user } = await authService.verifyOtp({
      role: resolveRole(req),
      phoneNumber: req.body.phoneNumber,
      otp: req.body.otp,
      name: req.body.name,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Get current user error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};

// POST /api/auth/logout-all-devices
export const logoutAllDevices = async (req, res) => {
  try {
    const token = await authService.logoutAllDevices(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Signed out of all other devices",
      token,
    });
  } catch (error) {
    console.error("Logout all devices error:", error);
    return respondWithError(res, error, "Internal server error");
  }
};
