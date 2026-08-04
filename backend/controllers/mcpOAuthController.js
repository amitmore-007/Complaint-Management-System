import {
  mcpOAuthService,
  ACCESS_TOKEN_TTL_SECONDS,
} from "../services/mcpOAuthService.js";
import { getHttpErrorStatus } from "../utils/httpError.js";

/**
 * HTTP only. Business rules live in services/mcpOAuthService.js; database
 * access in data/mcpOAuthData.js.
 *
 * OAuth endpoints answer with RFC 6749 error codes rather than the app's usual
 * { success, message } envelope, so they get their own error renderer.
 */
const respondOAuthError = (res, error, label) => {
  console.error(`[mcp-oauth.${label}] error:`, error);

  const status = getHttpErrorStatus(error) ?? 500;
  if (status === 500) return res.status(500).json({ error: "server_error" });

  return res.status(status).json({
    error: error.oauthError ?? "invalid_request",
    ...(error.oauthDescription
      ? { error_description: error.oauthDescription }
      : {}),
  });
};

/** The consent/login endpoints use the app envelope, not the OAuth one. */
const respondAppError = (res, error, label, fallback) => {
  console.error(`[mcp-oauth.${label}] error:`, error);

  const status = getHttpErrorStatus(error) ?? 500;
  return res.status(status).json({
    success: false,
    message: status === 500 ? fallback : error.message,
  });
};

// POST /mcp-oauth/register
export const registerClient = async (req, res) => {
  try {
    const { clientId, clientName, redirectUris } =
      await mcpOAuthService.registerClient({
        redirectUris: req.body.redirect_uris,
        clientName: req.body.client_name,
      });

    return res.status(201).json({
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
  } catch (error) {
    return respondOAuthError(res, error, "register");
  }
};

// GET /mcp-oauth/authorize
export const authorize = async (req, res) => {
  try {
    const redirectTo = await mcpOAuthService.buildAuthorizeRedirect({
      clientId: req.query.client_id,
      redirectUri: req.query.redirect_uri,
      responseType: req.query.response_type,
      codeChallenge: req.query.code_challenge,
      codeChallengeMethod: req.query.code_challenge_method,
      state: req.query.state,
    });

    return res.redirect(redirectTo);
  } catch (error) {
    return respondOAuthError(res, error, "authorize");
  }
};

// POST /mcp-oauth/authorize/complete
export const completeAuthorize = async (req, res) => {
  try {
    const redirectUri = await mcpOAuthService.completeAuthorize({
      clientId: req.body.client_id,
      redirectUri: req.body.redirect_uri,
      codeChallenge: req.body.code_challenge,
      state: req.body.state,
      token: req.body.token,
    });

    return res.json({ redirect_uri: redirectUri });
  } catch (error) {
    return respondAppError(res, error, "completeAuthorize", "server_error");
  }
};

// POST /mcp-oauth/token
export const token = async (req, res) => {
  try {
    const { grant_type: grantType } = req.body;

    if (grantType === "authorization_code") {
      const { accessToken, refreshToken } =
        await mcpOAuthService.exchangeAuthorizationCode({
          code: req.body.code,
          redirectUri: req.body.redirect_uri,
          clientId: req.body.client_id,
          codeVerifier: req.body.code_verifier,
        });

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
      });
    }

    if (grantType === "refresh_token") {
      const { accessToken, refreshToken } =
        await mcpOAuthService.exchangeRefreshToken({
          refreshToken: req.body.refresh_token,
          clientId: req.body.client_id,
        });

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
      });
    }

    return res.status(400).json({ error: "unsupported_grant_type" });
  } catch (error) {
    return respondOAuthError(res, error, "token");
  }
};

// POST /mcp-oauth/internal/validate-access-token
export const validateInternal = async (req, res) => {
  try {
    const body = await mcpOAuthService.validateAccessToken({
      internalSecret: req.headers["x-internal-secret"],
      accessToken: req.body.token,
    });

    return res.json({ success: true, body });
  } catch (error) {
    return respondAppError(res, error, "validateInternal", "server_error");
  }
};
