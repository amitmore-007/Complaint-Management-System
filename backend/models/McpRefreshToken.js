import mongoose from "mongoose";

// hashed refresh tokens for the mcp-oauth token endpoint — revocable,
// unlike the stateless JWT access tokens they're paired with
const mcpRefreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ["admin", "client", "technician"], required: true },
    // only meaningful for role="admin" — see McpAuthCode.tokenVersion
    tokenVersion: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

mcpRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("McpRefreshToken", mcpRefreshTokenSchema);
