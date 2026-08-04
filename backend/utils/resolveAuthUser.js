import { userData } from "../data/userData.js";

// Re-validates a decoded JWT payload against the current user record — shared by
// every auth middleware and the mcp-oauth token/validate endpoints, so the
// isActive / tokenVersion checks live in exactly one place.
export const resolveAuthUser = async ({ userId, role, tokenVersion }) => {
  if (!userId || !role) return { ok: false, reason: "not_found" };

  const user = await userData.findById(userId);
  if (!user || user.role !== role) return { ok: false, reason: "not_found" };

  // Previously admin-only, which meant "logout all devices" was silently
  // bypassable for other roles and on middlewares that skipped this helper.
  const expectedVersion = tokenVersion ?? 0;
  const currentVersion = user.tokenVersion ?? 0;
  if (expectedVersion !== currentVersion) {
    return { ok: false, reason: "stale_token" };
  }

  if (!user.isActive) return { ok: false, reason: "inactive" };

  return { ok: true, user };
};
