import SystemSetting from "../models/SystemSetting.js";

const AUTO_ASSIGN_SETTING_KEY = "complaint_auto_assign_enabled";

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

export const getComplaintAutoAssignEnabled = async () => {
  const setting = await SystemSetting.findOne({
    key: AUTO_ASSIGN_SETTING_KEY,
  }).select("booleanValue");

  if (!setting) {
    return DEFAULT_AUTO_ASSIGN_ENABLED;
  }

  return Boolean(setting.booleanValue);
};

export const setComplaintAutoAssignEnabled = async ({ enabled, adminId }) => {
  const safeEnabled = Boolean(enabled);

  const setting = await SystemSetting.findOneAndUpdate(
    { key: AUTO_ASSIGN_SETTING_KEY },
    {
      $set: {
        booleanValue: safeEnabled,
        ...(adminId ? { updatedByAdmin: adminId } : {}),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).select("booleanValue updatedByAdmin updatedAt");

  return setting;
};
