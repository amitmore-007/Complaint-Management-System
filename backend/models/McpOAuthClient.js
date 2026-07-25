import mongoose from "mongoose";

// dynamically registered MCP OAuth clients (RFC 7591) — public clients, PKCE required, no client secret
const mcpOAuthClientSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true },
    clientName: { type: String, trim: true },
    redirectUris: [{ type: String, required: true }],
  },
  { timestamps: true },
);

export default mongoose.model("McpOAuthClient", mcpOAuthClientSchema);
