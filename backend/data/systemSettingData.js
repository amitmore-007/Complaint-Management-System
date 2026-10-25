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

  /**
   * Atomically claim a once-only job run. Succeeds when the run has never
   * started, previously failed, or has sat in "sending" since before
   * `staleBefore` (the process died mid-run). Anything else — already sent, or
   * another caller mid-run — hits the unique key on the upsert and returns null.
   */
  claimRun: async ({ key, staleBefore }) => {
    try {
      return await SystemSetting.findOneAndUpdate(
        {
          key,
          $or: [
            { stringValue: "failed" },
            { stringValue: "sending", updatedAt: { $lt: staleBefore } },
          ],
        },
        { $set: { stringValue: "sending" } },
        { upsert: true, new: true },
      );
    } catch (error) {
      if (error?.code === 11000) return null;
      throw error;
    }
  },

  finishRun: ({ key, state }) =>
    SystemSetting.updateOne({ key }, { $set: { stringValue: state } }),
};
