import Admin from "../models/Admin.js";
import Client from "../models/Client.js";
import Technician from "../models/Technician.js";

const MODELS_BY_ROLE = { admin: Admin, client: Client, technician: Technician };

// re-validates a decoded JWT payload against the current user record —
// shared by roleAuth.js and the mcp-oauth token/validate endpoints so the
// isActive / admin tokenVersion checks live in exactly one place.
export const resolveAuthUser = async ({ userId, role, tokenVersion }) => {
  const Model = MODELS_BY_ROLE[role];
  if (!Model) return { ok: false, reason: "not_found" };

  const user = await Model.findById(userId);
  if (!user) return { ok: false, reason: "not_found" };

  if (role === "admin") {
    const expectedVersion = tokenVersion ?? 0;
    const currentVersion = user.tokenVersion ?? 0;
    if (expectedVersion !== currentVersion) {
      return { ok: false, reason: "stale_token" };
    }
  }

  if (!user.isActive) return { ok: false, reason: "inactive" };

  return { ok: true, user };
};
