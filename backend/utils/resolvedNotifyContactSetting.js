import SystemSetting from "../models/SystemSetting.js";

const PHONE_KEY = "resolved_notify_phone";
const NAME_KEY = "resolved_notify_name";

export const getResolvedNotifyContact = async () => {
  const [phoneSetting, nameSetting] = await Promise.all([
    SystemSetting.findOne({ key: PHONE_KEY }).select("stringValue"),
    SystemSetting.findOne({ key: NAME_KEY }).select("stringValue"),
  ]);

  return {
    phone:
      phoneSetting?.stringValue ?? process.env.RESOLVED_NOTIFY_PHONE ?? "",
    name: nameSetting?.stringValue ?? process.env.RESOLVED_NOTIFY_NAME ?? "",
  };
};

export const setResolvedNotifyContact = async ({ phone, name, adminId }) => {
  const adminUpdate = adminId ? { updatedByAdmin: adminId } : {};
  const ops = [];

  if (phone !== undefined) {
    ops.push(
      SystemSetting.findOneAndUpdate(
        { key: PHONE_KEY },
        { $set: { stringValue: String(phone).trim(), ...adminUpdate } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  if (name !== undefined) {
    ops.push(
      SystemSetting.findOneAndUpdate(
        { key: NAME_KEY },
        { $set: { stringValue: String(name).trim(), ...adminUpdate } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  await Promise.all(ops);
  return getResolvedNotifyContact();
};
