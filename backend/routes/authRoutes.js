import express from "express";
import rateLimit from "express-rate-limit";

import {
  sendOtp,
  verifyOtp,
  getMe,
  logoutAllDevices,
} from "../controllers/authController.js";
import { authenticateAny } from "../middleware/roleAuth.js";

const router = express.Router();

// Verification was previously unthrottled, leaving a 6-digit code open to
// brute force. express-rate-limit was already a dependency but unused.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
});

const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again in a few minutes.",
  },
});

router.post("/send-otp", sendLimiter, sendOtp);
router.post("/verify-otp", verifyLimiter, verifyOtp);
router.get("/me", authenticateAny, getMe);
router.post("/logout-all-devices", authenticateAny, logoutAllDevices);

export default router;
