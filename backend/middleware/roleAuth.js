import jwt from "jsonwebtoken";
import { resolveAuthUser } from "../utils/resolveAuthUser.js";

const readBearerToken = (req) => {
  const authHeader = req.headers["authorization"];
  return authHeader && authHeader.split(" ")[1];
};

const rejectionFor = (reason) =>
  reason === "stale_token"
    ? { status: 401, message: "Session expired. Please login again." }
    : { status: 401, message: "Invalid or inactive user" };

/**
 * The single authentication path. Every variant below is this function with
 * different options — previously this block was duplicated four times, and
 * only one copy enforced tokenVersion, so "logout all devices" was bypassable
 * on any route guarded by the other three.
 *
 * @param roles  allowed roles; empty/omitted means any valid role
 * @param scope  required JWT `scope` claim, if any (attendance portal)
 */
const authenticate = ({ roles = [], scope = null } = {}) => {
  return async (req, res, next) => {
    try {
      const token = readBearerToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: scope ? "Session token required." : "Access token required",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(scope ? 401 : 403).json({
          success: false,
          message: scope
            ? "Session expired. Please enter your PIN again."
            : "Invalid or expired token",
        });
      }

      // A portal token must not satisfy a normal route, and vice versa.
      if ((decoded.scope ?? null) !== scope) {
        return res.status(403).json({
          success: false,
          message: scope ? "Invalid session scope." : "Invalid token scope",
        });
      }

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          message:
            roles.length === 1
              ? `${roles[0]} access required`
              : "Access denied. Insufficient permissions.",
        });
      }

      const result = await resolveAuthUser(decoded);

      if (!result.ok) {
        const { status, message } = rejectionFor(result.reason);
        return res.status(status).json({ success: false, message });
      }

      req.user = {
        id: result.user._id,
        role: decoded.role,
        ...result.user.toObject(),
      };
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(403).json({
        success: false,
        message: "Authentication failed",
      });
    }
  };
};

export const authenticateClient = authenticate({ roles: ["client"] });
export const authenticateTechnician = authenticate({ roles: ["technician"] });
export const authenticateAdmin = authenticate({ roles: ["admin"] });

// Any valid role. `authenticateToken` is the historical name used by the
// equipment and store routes; both names resolve to the same middleware.
export const authenticateAny = authenticate();
export const authenticateToken = authenticateAny;

// Attendance portal: PIN-derived session, admin/technician only.
export const authenticatePortal = authenticate({
  roles: ["admin", "technician"],
  scope: "attendance-portal",
});

// Post-authentication role gate, used alongside authenticateToken.
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};
