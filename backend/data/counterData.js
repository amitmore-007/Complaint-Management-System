import Counter from "../models/Counter.js";

export const counterData = {
  /** Atomically bump a named counter and return its new value. */
  nextSequence: async (key) => {
    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return counter.seq;
  },
};
