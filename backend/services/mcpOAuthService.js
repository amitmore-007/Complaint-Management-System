import crypto from "crypto";
import jwt from "jsonwebtoken";

import { mcpOAuthData } from "../data/mcpOAuthData.js";
import { resolveAuthUser } from "../utils/resolveAuthUser.js";
import { createHttpError } from "../utils/httpError.js";

const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SECONDS =
  Number(process.env.MCP_ACCESS_TOKEN_TTL) || 3600;

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const verifyPkce = (verifier, challenge) =>
  crypto.createHash("sha256").update(verifier).digest("base64url") === challenge;

/**
 * OAuth errors use RFC 6749 codes rather than plain messages, so they carry an
 * extra `oauthError` field that the controller renders instead of `message`.
 */
const oauthError = (status, error, description) => {
  const err = createHttpError(status, description || error);
  err.oauthError = error;
  err.oauthDescription = description;
  return err;
};

const issueTokenPair = async ({ clientId, userId, role, tokenVersion }) => {
  // tokenVersion is carried for every role now that it lives on the merged User
  // model — previously admin-only, which left other roles unable to be
  // force-logged-out.
  const accessToken = jwt.sign(
    { userId, role, tokenVersion: tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
  );

  const refreshToken = crypto.randomBytes(48).toString("base64url");
  await mcpOAuthData.refreshTokens.create({
    tokenHash: hashRefreshToken(refreshToken),
    clientId,
    userId,
    role,
    tokenVersion: tokenVersion ?? 0,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
};

const requireKnownClient = async ({ clientId, redirectUri }) => {
  const client = await mcpOAuthData.clients.findByClientId(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) return null;
  return client;
};

export const mcpOAuthService = {
  /** RFC 7591 dynamic registration — public client, PKCE only, no secret. */
  registerClient: async ({ redirectUris, clientName }) => {
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      throw oauthError(
        400,
        "invalid_client_metadata",
        "redirect_uris is required",
      );
    }

    const clientId = crypto.randomUUID();
    await mcpOAuthData.clients.create({ clientId, clientName, redirectUris });

    return { clientId, clientName, redirectUris };
  },

  /** Validates the authorize request and returns the consent-page redirect. */
  buildAuthorizeRedirect: async ({
    clientId,
    redirectUri,
    responseType,
    codeChallenge,
    codeChallengeMethod,
    state,
  }) => {
    if (responseType !== "code") {
      throw oauthError(400, "unsupported_response_type");
    }
    if (!codeChallenge || (codeChallengeMethod && codeChallengeMethod !== "S256")) {
      throw oauthError(400, "invalid_request", "PKCE (S256) is required");
    }

    const client = await requireKnownClient({ clientId, redirectUri });
    if (!client) throw oauthError(400, "invalid_client");

    const query = new URLSearchParams({
      client_id: clientId,
      client_name: client.clientName || "",
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      state: state || "",
    }).toString();

    return `${process.env.FRONTEND_URL}/oauth/authorize?${query}`;
  },

  /** Called by the frontend once the user has completed OTP login. */
  completeAuthorize: async ({
    clientId,
    redirectUri,
    codeChallenge,
    state,
    token,
  }) => {
    if (!clientId || !redirectUri || !codeChallenge || !token) {
      throw createHttpError(400, "Missing required fields");
    }

    const client = await requireKnownClient({ clientId, redirectUri });
    if (!client) throw createHttpError(400, "Unknown client or redirect_uri");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw createHttpError(401, "Invalid or expired login");
    }

    const result = await resolveAuthUser(decoded);
    if (!result.ok) throw createHttpError(401, "Invalid or inactive user");

    const code = crypto.randomBytes(32).toString("base64url");
    await mcpOAuthData.authCodes.create({
      code,
      clientId,
      redirectUri,
      userId: String(result.user._id),
      role: decoded.role,
      codeChallenge,
      tokenVersion: decoded.tokenVersion ?? 0,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    });

    const query = new URLSearchParams({ code, state: state || "" }).toString();
    return `${redirectUri}?${query}`;
  },

  exchangeAuthorizationCode: async ({
    code,
    redirectUri,
    clientId,
    codeVerifier,
  }) => {
    if (!code || !redirectUri || !clientId || !codeVerifier) {
      throw oauthError(400, "invalid_request");
    }

    const authCode = await mcpOAuthData.authCodes.findByCode(code);
    if (!authCode || authCode.used || authCode.expiresAt < new Date()) {
      throw oauthError(
        400,
        "invalid_grant",
        "code is invalid, used, or expired",
      );
    }
    if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
      throw oauthError(400, "invalid_grant", "client_id/redirect_uri mismatch");
    }
    if (!verifyPkce(codeVerifier, authCode.codeChallenge)) {
      throw oauthError(400, "invalid_grant", "code_verifier does not match");
    }

    // Single-use: burn the code before issuing anything.
    authCode.used = true;
    await authCode.save();

    const result = await resolveAuthUser({
      userId: authCode.userId,
      role: authCode.role,
      tokenVersion: authCode.tokenVersion,
    });
    if (!result.ok) {
      throw oauthError(400, "invalid_grant", "user no longer valid");
    }

    return issueTokenPair({
      clientId,
      userId: authCode.userId,
      role: authCode.role,
      tokenVersion: result.user.tokenVersion,
    });
  },

  exchangeRefreshToken: async ({ refreshToken, clientId }) => {
    if (!refreshToken || !clientId) throw oauthError(400, "invalid_request");

    const stored = await mcpOAuthData.refreshTokens.findByHash(
      hashRefreshToken(refreshToken),
    );
    if (
      !stored ||
      stored.revoked ||
      stored.expiresAt < new Date() ||
      stored.clientId !== clientId
    ) {
      throw oauthError(400, "invalid_grant");
    }

    const result = await resolveAuthUser({
      userId: stored.userId,
      role: stored.role,
      tokenVersion: stored.tokenVersion,
    });
    if (!result.ok) {
      throw oauthError(400, "invalid_grant", "user no longer valid");
    }

    // Rotate: the presented token is spent.
    stored.revoked = true;
    await stored.save();

    return issueTokenPair({
      clientId,
      userId: stored.userId,
      role: stored.role,
      tokenVersion: result.user.tokenVersion,
    });
  },

  /** Called by the Python MCP server, guarded by a shared secret. */
  validateAccessToken: async ({ internalSecret, accessToken }) => {
    if (internalSecret !== process.env.MCP_INTERNAL_SECRET) {
      throw createHttpError(401, "Invalid internal secret");
    }
    if (!accessToken) throw createHttpError(400, "token is required");

    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch {
      throw createHttpError(401, "Invalid or expired token");
    }

    const result = await resolveAuthUser(decoded);
    if (!result.ok) throw createHttpError(401, "Invalid or inactive user");

    return { userId: String(result.user._id), role: decoded.role };
  },
};
