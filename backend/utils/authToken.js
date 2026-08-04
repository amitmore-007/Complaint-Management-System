import jwt from "jsonwebtoken";

// Admin sessions were historically issued with a 999-year TTL. Kept as-is here
// because shortening it force-logs-out every admin — change it in its own deploy.
const TOKEN_TTL_BY_ROLE = {
  admin: "999y",
  client: "20d",
  technician: "20d",
};

export const generateAuthToken = ({ userId, role, tokenVersion = 0 }) =>
  jwt.sign({ userId, role, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_BY_ROLE[role] ?? "20d",
  });

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
