import BillingRecord from "../models/BillingRecord.js";

const COMPLAINT_POPULATE = {
  path: "complaint",
  select: "complaintId title description status store resolvedAt",
  populate: { path: "store", select: "name" },
};

export const billingRecordData = {
  list: ({ filter = {}, page = 1, limit = 30 }) =>
    BillingRecord.find(filter)
      .populate(COMPLAINT_POPULATE)
      .populate("technician", "name phoneNumber")
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),

  count: (filter = {}) => BillingRecord.countDocuments(filter),

  findByComplaint: (complaintId) => BillingRecord.findOne({ complaint: complaintId }),

  findById: (id) => BillingRecord.findById(id),

  findByIdPopulated: (id) =>
    BillingRecord.findById(id)
      .populate(COMPLAINT_POPULATE)
      .populate("technician", "name phoneNumber")
      .populate("updatedByAdmin", "name phoneNumber"),

  create: (data) => BillingRecord.create(data),

  save: (record) => record.save(),
};
