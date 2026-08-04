import SystemSetting from "../models/SystemSetting.js";

export const systemSettingData = {
  findByKey: ({ key, select }) => {
    const query = SystemSetting.findOne({ key });
    return select ? query.select(select) : query;
  },

  upsert: ({ key, set }) =>
    SystemSetting.findOneAndUpdate(
      { key },
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
};
