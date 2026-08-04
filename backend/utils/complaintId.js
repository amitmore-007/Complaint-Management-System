import { counterData } from "../data/counterData.js";
import { getStoreCode } from "./storeCodes.js";

const padSequence = (seq, width = 6) => String(seq).padStart(width, "0");

export const generateNextComplaintId = async ({ storeName }) => {
  const storeCode = getStoreCode(storeName);
  const counterKey = `complaint:${storeCode}`;

  const seq = await counterData.nextSequence(counterKey);

  return `CMP-${storeCode}-${padSequence(seq)}`;
};
