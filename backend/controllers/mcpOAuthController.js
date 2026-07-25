import crypto from "crypto";
import jwt from "jsonwebtoken";
import McpOAuthClient from "../models/McpOAuthClient.js";
import McpAuthCode from "../models/McpAuthCode.js";
import McpRefreshToken from "../models/McpRefreshToken.js";
import { resolveAuthUser } from "../utils/resolveAuthUser.js";

const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.MCP_ACCESS_TOKEN_TTL) || 3600;

const hashRefreshToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const verifyPkce = (verifier, challenge) => {
  const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
  return computed === challenge;
};

const issueTokenPair = async (clientId, userId, role, tokenVersion) => {
  const accessPayload = { userId, role };
  if (role === "admin") accessPayload.tokenVersion = tokenVersion ?? 0;

  const accessToken = jwt.sign(accessPayload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await McpRefreshToken.create({
    tokenHash: hashRefreshToken(refreshToken),
    clientId,
    userId,
    role,
    tokenVersion: role === "admin" ? tokenVersion ?? 0 : 0,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
};

// POST /mcp-oauth/register — RFC 7591 dynamic client registration (public client, PKCE only, no secret)
export const registerClient = async (req, res) => {
  try {
    const { redirect_uris: redirectUris, client_name: clientName } = req.body;

    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      return res.status(400).json({
        error: "invalid_client_metadata",
        error_description: "redirect_uris is required",
      });
    }

    const clientId = crypto.randomUUID();
    await McpOAuthClient.create({ clientId, clientName, redirectUris });

    return res.status(201).json({
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
  } catch (error) {
    console.error("[mcp-oauth.register] error:", error);
    return res.status(500).json({ error: "server_error" });
  }
};

// GET /mcp-oauth/authorize — validates the request, hands off to the frontend consent/login page
export const authorize = async (req, res) => {
  try {
    const {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      state,
    } = req.query;

    if (responseType !== "code") {
      return res.status(400).json({ error: "unsupported_response_type" });
    }
    if (!codeChallenge || (codeChallengeMethod && codeChallengeMethod !== "S256")) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "PKCE (S256) is required",
      });
    }

    const client = await McpOAuthClient.findOne({ clientId });
    if (!client || !client.redirectUris.includes(redirectUri)) {
      return res.status(400).json({ error: "invalid_client" });
    }

    const query = new URLSearchParams({
      client_id: clientId,
      client_name: client.clientName || "",
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      state: state || "",
    }).toString();

    return res.redirect(`${process.env.FRONTEND_URL}/oauth/authorize?${query}`);
  } catch (error) {
    console.error("[mcp-oauth.authorize] error:", error);
    return res.status(500).json({ error: "server_error" });
  }
};

// POST /mcp-oauth/authorize/complete — called by the frontend right after the user finishes OTP login
export const completeAuthorize = async (req, res) => {
  try {
    const { client_id: clientId, redirect_uri: redirectUri, code_challenge: codeChallenge, state, token } = req.body;

    if (!clientId || !redirectUri || !codeChallenge || !token) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const client = await McpOAuthClient.findOne({ clientId });
    if (!client || !client.redirectUris.includes(redirectUri)) {
      return res.status(400).json({ success: false, message: "Unknown client or redirect_uri" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid or expired login" });
    }

    const result = await resolveAuthUser(decoded);
    if (!result.ok) {
      return res.status(401).json({ success: false, message: "Invalid or inactive user" });
    }

    const code = crypto.randomBytes(32).toString("base64url");
    await McpAuthCode.create({
      code,
      clientId,
      redirectUri,
      userId: String(result.user._id),
      role: decoded.role,
      codeChallenge,
      tokenVersion: decoded.role === "admin" ? decoded.tokenVersion ?? 0 : 0,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    });

    const redirectQuery = new URLSearchParams({ code, state: state || "" }).toString();
    return res.json({ redirect_uri: `${redirectUri}?${redirectQuery}` });
  } catch (error) {
    console.error("[mcp-oauth.completeAuthorize] error:", error);
    return res.status(500).json({ success: false, message: "server_error" });
  }
};

// POST /mcp-oauth/token — authorization_code and refresh_token grants
export const token = async (req, res) => {
  try {
    const { grant_type: grantType } = req.body;

    if (grantType === "authorization_code") {
      const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier } = req.body;

      if (!code || !redirectUri || !clientId || !codeVerifier) {
        return res.status(400).json({ error: "invalid_request" });
      }

      const authCode = await McpAuthCode.findOne({ code });
      if (!authCode || authCode.used || authCode.expiresAt < new Date()) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "code is invalid, used, or expired",
        });
      }
      if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "client_id/redirect_uri mismatch",
        });
      }
      if (!verifyPkce(codeVerifier, authCode.codeChallenge)) {
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "code_verifier does not match",
        });
      }

      authCode.used = true;
      await authCode.save();

      const result = await resolveAuthUser({
        userId: authCode.userId,
        role: authCode.role,
        tokenVersion: authCode.tokenVersion,
      });
      if (!result.ok) {
        return res.status(400).json({ error: "invalid_grant", error_description: "user no longer valid" });
      }

      const { accessToken, refreshToken } = await issueTokenPair(
        clientId,
        authCode.userId,
        authCode.role,
        result.user.tokenVersion,
      );

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
      });
    }

    if (grantType === "refresh_token") {
      const { refresh_token: refreshToken, client_id: clientId } = req.body;

      if (!refreshToken || !clientId) {
        return res.status(400).json({ error: "invalid_request" });
      }

      const stored = await McpRefreshToken.findOne({ tokenHash: hashRefreshToken(refreshToken) });
      if (!stored || stored.revoked || stored.expiresAt < new Date() || stored.clientId !== clientId) {
        return res.status(400).json({ error: "invalid_grant" });
      }

      const result = await resolveAuthUser({
        userId: stored.userId,
        role: stored.role,
        tokenVersion: stored.tokenVersion,
      });
      if (!result.ok) {
        return res.status(400).json({ error: "invalid_grant", error_description: "user no longer valid" });
      }

      stored.revoked = true;
      await stored.save();

      const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
        clientId,
        stored.userId,
        stored.role,
        result.user.tokenVersion,
      );

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: newRefreshToken,
      });
    }

    return res.status(400).json({ error: "unsupported_grant_type" });
  } catch (error) {
    console.error("[mcp-oauth.token] error:", error);
    return res.status(500).json({ error: "server_error" });
  }
};

// POST /mcp-oauth/internal/validate-access-token — called by the Python MCP server, guarded by shared secret
export const validateInternal = async (req, res) => {
  try {
    if (req.headers["x-internal-secret"] !== process.env.MCP_INTERNAL_SECRET) {
      return res.status(401).json({ success: false, message: "Invalid internal secret" });
    }

    const { token: accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const result = await resolveAuthUser(decoded);
    if (!result.ok) {
      return res.status(401).json({ success: false, message: "Invalid or inactive user" });
    }

    return res.json({
      success: true,
      body: { userId: String(result.user._id), role: decoded.role },
    });
  } catch (error) {
    console.error("[mcp-oauth.validateInternal] error:", error);
    return res.status(500).json({ success: false, message: "server_error" });
  }
};
