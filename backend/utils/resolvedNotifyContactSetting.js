import SystemSetting from "../models/SystemSetting.js";

const CONTACTS_KEY = "resolved_notify_contacts";
// Legacy single-contact keys (for one-time migration)
const LEGACY_PHONE_KEY = "resolved_notify_phone";
const LEGACY_NAME_KEY = "resolved_notify_name";

const parseContacts = (stringValue) => {
  try {
    const parsed = JSON.parse(stringValue);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return [];
};

export const getResolvedNotifyContacts = async () => {
  const setting = await SystemSetting.findOne({ key: CONTACTS_KEY }).select(
    "stringValue",
  );

  if (setting) {
    return parseContacts(setting.stringValue);
  }

  // One-time migration from legacy single-contact keys
  const [phoneSetting, nameSetting] = await Promise.all([
    SystemSetting.findOne({ key: LEGACY_PHONE_KEY }).select("stringValue"),
    SystemSetting.findOne({ key: LEGACY_NAME_KEY }).select("stringValue"),
  ]);

  const legacyPhone =
    phoneSetting?.stringValue ?? process.env.RESOLVED_NOTIFY_PHONE ?? "";
  const legacyName =
    nameSetting?.stringValue ?? process.env.RESOLVED_NOTIFY_NAME ?? "";

  if (legacyPhone) {
    const contacts = [{ phone: legacyPhone, name: legacyName }];
    await SystemSetting.findOneAndUpdate(
      { key: CONTACTS_KEY },
      { $set: { stringValue: JSON.stringify(contacts) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return contacts;
  }

  return [];
};

export const setResolvedNotifyContacts = async ({ contacts, adminId }) => {
  const safeContacts = Array.isArray(contacts)
    ? contacts
        .filter((c) => c && typeof c.phone === "string" && c.phone.trim())
        .map((c) => ({ phone: c.phone.trim(), name: (c.name || "").trim() }))
    : [];

  await SystemSetting.findOneAndUpdate(
    { key: CONTACTS_KEY },
    {
      $set: {
        stringValue: JSON.stringify(safeContacts),
        ...(adminId ? { updatedByAdmin: adminId } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return safeContacts;
};

// Legacy shim kept for any callers that still use the single-contact API
export const getResolvedNotifyContact = async () => {
  const contacts = await getResolvedNotifyContacts();
  const first = contacts[0] ?? {};
  return { phone: first.phone ?? "", name: first.name ?? "" };
};

export const setResolvedNotifyContact = async ({ phone, name, adminId }) => {
  const contacts = await getResolvedNotifyContacts();
  const updated = [
    { phone: phone ?? "", name: name ?? "" },
    ...contacts.slice(1),
  ];
  await setResolvedNotifyContacts({ contacts: updated, adminId });
  return { phone: updated[0].phone, name: updated[0].name };
};
