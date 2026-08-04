import crypto from "crypto";

/**
 * Attendance-portal PIN hash. The link token doubles as the HMAC key, so
 * revoking the token invalidates the PIN too.
 */
export const portalHashPin = (pin, token) =>
  crypto.createHmac("sha256", token).update(pin).digest("hex");
