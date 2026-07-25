import express from "express";
import {
  registerClient,
  authorize,
  completeAuthorize,
  token,
  validateInternal,
} from "../controllers/mcpOAuthController.js";

const router = express.Router();

// public — dynamic client registration (RFC 7591)
router.post("/register", registerClient);

// public — redirects the browser to the frontend consent/login page
router.get("/authorize", authorize);

// public — called by the frontend after OTP login completes
router.post("/authorize/complete", completeAuthorize);

// public — authorization_code / refresh_token exchange
router.post("/token", token);

// internal — guarded by X-Internal-Secret, called by the MCP server's auth middleware
router.post("/internal/validate-access-token", validateInternal);

export default router;
