import AssetRecord from "../models/AssetRecord.js";

const TECHNICIAN_POPULATE = ["technician", "name phoneNumber"];

export const assetRecordData = {
  list: ({ filter = {}, page = 1, limit = 10 }) =>
    AssetRecord.find(filter)
      .populate(...TECHNICIAN_POPULATE)
      .sort({ submissionDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit),

  listAll: () =>
    AssetRecord.find({})
      .populate(...TECHNICIAN_POPULATE)
      .sort({ submissionDate: -1 }),

  /** Newest first — the Excel export relies on this ordering to dedupe. */
  listAllNewestFirst: () =>
    AssetRecord.find({})
      .populate(...TECHNICIAN_POPULATE)
      .sort({ submissionDate: -1, createdAt: -1 }),

  findById: (id) => AssetRecord.findById(id).populate(...TECHNICIAN_POPULATE),

  count: (filter = {}) => AssetRecord.countDocuments(filter),

  create: (data) => AssetRecord.create(data),

  save: async (record) => {
    await record.save();
    await record.populate(...TECHNICIAN_POPULATE);
    return record;
  },

  deleteById: (id) => AssetRecord.findByIdAndDelete(id),

  /** Every distinct storeName ever submitted — seeds the store dropdown. */
  distinctStoreNames: () => AssetRecord.distinct("storeName"),
};
