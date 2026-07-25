import mongoose from "mongoose";

// one-time authorization codes issued by GET /mcp-oauth/authorize/complete,
// exchanged by POST /mcp-oauth/token (grant_type=authorization_code)
const mcpAuthCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    redirectUri: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ["admin", "client", "technician"], required: true },
    codeChallenge: { type: String, required: true },
    // only meaningful for role="admin" (backs the "logout all devices" check);
    // captured here so the token endpoint can re-validate it without a DB round trip
    tokenVersion: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

mcpAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("McpAuthCode", mcpAuthCodeSchema);
