import crypto from "crypto";

/**
 * Minimal signed client for the Tuya Cloud OpenAPI.
 *
 * Auth model (Tuya "new signature" algorithm):
 *   stringToSign = METHOD \n sha256(body) \n "" \n pathWithSortedQuery
 *   token call:    sign = HMAC_SHA256(clientId + t + stringToSign, secret)
 *   business call: sign = HMAC_SHA256(clientId + accessToken + t + stringToSign, secret)
 *
 * Query values are sent unencoded so the signed URL and the requested URL are
 * byte-identical — every value we pass (device ids, DP codes, epoch ms, row
 * keys) is URL-safe, and Tuya rejects the sign when the two differ.
 */

const DEFAULT_BASE_URL = "https://openapi.tuyain.com";
const REQUEST_TIMEOUT_MS = 15_000;
// Refresh a little before Tuya's stated expiry so an in-flight call never
// carries a token that dies mid-request.
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
// Tuya error codes meaning "the access token is no longer valid".
const TOKEN_INVALID_CODES = new Set([1010, 1011]);

let cachedToken = null; // { accessToken, expiresAt }
let callListener = null;

/**
 * Register a callback fired once per HTTP call to Tuya (token calls included —
 * they count against the monthly allowance too). Fire-and-forget: a failing
 * listener never breaks the API call.
 */
export const setTuyaCallListener = (listener) => {
  callListener = listener;
};

const getConfig = () => {
  const clientId = process.env.TUYA_ACCESS_ID?.trim();
  const secret = process.env.TUYA_ACCESS_SECRET?.trim();
  const baseUrl = (process.env.TUYA_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  return { clientId, secret, baseUrl };
};

export const isTuyaConfigured = () => {
  const { clientId, secret } = getConfig();
  return Boolean(clientId && secret);
};

const sha256Hex = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const hmacUpper = (value, secret) =>
  crypto.createHmac("sha256", secret).update(value).digest("hex").toUpperCase();

const buildPathWithQuery = (path, query = {}) => {
  const pairs = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`);
  return pairs.length ? `${path}?${pairs.join("&")}` : path;
};

const signedFetch = async ({ method, url, body, accessToken }) => {
  const { clientId, secret, baseUrl } = getConfig();
  const bodyText = body ? JSON.stringify(body) : "";
  const t = Date.now().toString();
  const stringToSign = [method, sha256Hex(bodyText), "", url].join("\n");
  const sign = hmacUpper(
    `${clientId}${accessToken || ""}${t}${stringToSign}`,
    secret,
  );

  const headers = {
    client_id: clientId,
    sign,
    t,
    sign_method: "HMAC-SHA256",
    ...(accessToken ? { access_token: accessToken } : {}),
    ...(bodyText ? { "Content-Type": "application/json" } : {}),
  };

  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: bodyText || undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  Promise.resolve()
    .then(() => callListener?.())
    .catch(() => {});

  const json = await response.json().catch(() => null);
  if (!json) {
    throw new Error(`Tuya ${method} ${url} returned HTTP ${response.status}`);
  }
  return json;
};

const fetchAccessToken = async () => {
  const json = await signedFetch({
    method: "GET",
    url: "/v1.0/token?grant_type=1",
  });
  if (!json.success) {
    throw new Error(`Tuya token error ${json.code}: ${json.msg}`);
  }
  cachedToken = {
    accessToken: json.result.access_token,
    expiresAt:
      Date.now() + Number(json.result.expire_time) * 1000 - TOKEN_EXPIRY_MARGIN_MS,
  };
  return cachedToken.accessToken;
};

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  return fetchAccessToken();
};

/**
 * Call a Tuya OpenAPI endpoint and return its `result`. Throws on any
 * `success: false`, retrying once when the failure is an expired token.
 */
export const tuyaRequest = async ({ method = "GET", path, query, body }) => {
  if (!isTuyaConfigured()) {
    throw new Error("Tuya is not configured (TUYA_ACCESS_ID / TUYA_ACCESS_SECRET)");
  }

  const url = buildPathWithQuery(path, query);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken = await getAccessToken();
    const json = await signedFetch({ method, url, body, accessToken });

    if (json.success) return json.result;

    if (attempt === 0 && TOKEN_INVALID_CODES.has(Number(json.code))) {
      cachedToken = null;
      continue;
    }

    const error = new Error(`Tuya ${method} ${path} error ${json.code}: ${json.msg}`);
    error.tuyaCode = json.code;
    throw error;
  }

  // Unreachable: the loop either returns or throws.
  throw new Error(`Tuya ${method} ${path} failed`);
};
