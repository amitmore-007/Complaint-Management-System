import { systemSettingData } from "../data/systemSettingData.js";
import { GEOFENCE_MODES } from "../utils/geofence.js";
import { createHttpError } from "../utils/httpError.js";

/**
 * All SystemSetting-backed configuration. Previously split across
 * utils/complaintAutoAssignSetting.js and utils/resolvedNotifyContactSetting.js,
 * both of which reached into the model directly.
 */

const AUTO_ASSIGN_KEY = "complaint_auto_assign_enabled";
const CONTACTS_KEY = "resolved_notify_contacts";
const GEOFENCE_MODE_KEY = "complaint_geofence_mode";
// Superseded by CONTACTS_KEY; read once and migrated forward.
const LEGACY_PHONE_KEY = "resolved_notify_phone";
const LEGACY_NAME_KEY = "resolved_notify_name";

const parseBooleanEnv = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;

  return fallback;
};

const DEFAULT_AUTO_ASSIGN_ENABLED = parseBooleanEnv(
  process.env.COMPLAINT_AUTO_ASSIGN_ENABLED,
  true,
);

/**
 * Ships in "warn": locations are recorded and out-of-range attempts flagged,
 * but nothing is blocked. Switch to "enforce" only once the recorded distances
 * show what a realistic radius per store actually is.
 */
const DEFAULT_GEOFENCE_MODE = GEOFENCE_MODES.includes(
  process.env.COMPLAINT_GEOFENCE_MODE,
)
  ? process.env.COMPLAINT_GEOFENCE_MODE
  : "warn";

const parseContacts = (stringValue) => {
  try {
    const parsed = JSON.parse(stringValue);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through to []
  }
  return [];
};

const normalizeContacts = (contacts) =>
  Array.isArray(contacts)
    ? contacts
        .filter((c) => c && typeof c.phone === "string" && c.phone.trim())
        .map((c) => ({ phone: c.phone.trim(), name: (c.name || "").trim() }))
    : [];

/**
 * Exported standalone because the complaint flow needs them directly, without
 * pulling in the whole admin-facing settings surface.
 */
export const getComplaintAutoAssignEnabled = async () => {
  const setting = await systemSettingData.findByKey({
    key: AUTO_ASSIGN_KEY,
    select: "booleanValue",
  });

  return setting ? Boolean(setting.booleanValue) : DEFAULT_AUTO_ASSIGN_ENABLED;
};

/**
 * The kill switch for geofencing. Read on every technician status update, so
 * an admin can drop back to "warn" from the settings page the moment something
 * goes wrong in the field — no redeploy.
 */
export const getComplaintGeofenceMode = async () => {
  const setting = await systemSettingData.findByKey({
    key: GEOFENCE_MODE_KEY,
    select: "stringValue",
  });

  return GEOFENCE_MODES.includes(setting?.stringValue)
    ? setting.stringValue
    : DEFAULT_GEOFENCE_MODE;
};

export const getResolvedNotifyContacts = async () => {
  const setting = await systemSettingData.findByKey({
    key: CONTACTS_KEY,
    select: "stringValue",
  });

  if (setting) return parseContacts(setting.stringValue);

  // One-time migration from the legacy single-contact keys.
  const [phoneSetting, nameSetting] = await Promise.all([
    systemSettingData.findByKey({
      key: LEGACY_PHONE_KEY,
      select: "stringValue",
    }),
    systemSettingData.findByKey({
      key: LEGACY_NAME_KEY,
      select: "stringValue",
    }),
  ]);

  const legacyPhone =
    phoneSetting?.stringValue ?? process.env.RESOLVED_NOTIFY_PHONE ?? "";
  const legacyName =
    nameSetting?.stringValue ?? process.env.RESOLVED_NOTIFY_NAME ?? "";

  if (!legacyPhone) return [];

  const contacts = [{ phone: legacyPhone, name: legacyName }];
  await systemSettingData.upsert({
    key: CONTACTS_KEY,
    set: { stringValue: JSON.stringify(contacts) },
  });

  return contacts;
};

export const settingsService = {
  getAutoAssign: async () => ({
    autoAssignEnabled: await getComplaintAutoAssignEnabled(),
  }),

  setAutoAssign: async ({ enabled, adminId }) => {
    if (typeof enabled !== "boolean") {
      throw createHttpError(400, "enabled must be a boolean");
    }

    const setting = await systemSettingData.upsert({
      key: AUTO_ASSIGN_KEY,
      set: {
        booleanValue: enabled,
        ...(adminId ? { updatedByAdmin: adminId } : {}),
      },
    });

    return {
      autoAssignEnabled: Boolean(setting?.booleanValue),
      updatedAt: setting?.updatedAt,
    };
  },

  getGeofenceMode: async () => ({
    geofenceMode: await getComplaintGeofenceMode(),
  }),

  setGeofenceMode: async ({ mode, adminId }) => {
    if (!GEOFENCE_MODES.includes(mode)) {
      throw createHttpError(
        400,
        `mode must be one of: ${GEOFENCE_MODES.join(", ")}`,
      );
    }

    const setting = await systemSettingData.upsert({
      key: GEOFENCE_MODE_KEY,
      set: {
        stringValue: mode,
        ...(adminId ? { updatedByAdmin: adminId } : {}),
      },
    });

    return {
      geofenceMode: setting?.stringValue ?? mode,
      updatedAt: setting?.updatedAt,
    };
  },

  getResolvedNotifyContacts,

  setResolvedNotifyContacts: async ({ contacts, adminId }) => {
    if (!Array.isArray(contacts)) {
      throw createHttpError(400, "contacts must be an array");
    }

    const safeContacts = normalizeContacts(contacts);

    await systemSettingData.upsert({
      key: CONTACTS_KEY,
      set: {
        stringValue: JSON.stringify(safeContacts),
        ...(adminId ? { updatedByAdmin: adminId } : {}),
      },
    });

    return safeContacts;
  },
};
