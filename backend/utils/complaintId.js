import Counter from "../models/Counter.js";
import { getStoreCode } from "./storeCodes.js";

const padSequence = (seq, width = 6) => String(seq).padStart(width, "0");

export const generateNextComplaintId = async ({ storeName }) => {
  const storeCode = getStoreCode(storeName);
  const counterKey = `complaint:${storeCode}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `CMP-${storeCode}-${padSequence(counter.seq)}`;
};
