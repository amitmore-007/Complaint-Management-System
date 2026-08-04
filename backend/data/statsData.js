import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import Store from "../models/Store.js";

/**
 * All analytics queries. The aggregation pipelines are queries, so they live
 * here; statsService owns the shaping and arithmetic on top of the raw rows.
 */

const COMPLAINT_FIELDS =
  "complaintId title description store priority status createdAt completedAt resolvedAt assignedAt startedAt";

const POPULATE_OPTIONS = [
  { path: "createdBy", select: "name phoneNumber role" },
  { path: "assignedTechnician", select: "name phoneNumber" },
  { path: "assignedBy", select: "name" },
  { path: "store", select: "name managers" },
];

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Shared shape for every drilldown list. */
const drilldown = (filter, sort) =>
  Complaint.find(filter)
    .select(COMPLAINT_FIELDS)
    .populate(POPULATE_OPTIONS)
    .sort(sort)
    .lean();

// Age-bucket derivation, shared by the summary and its drilldown.
const AGE_BUCKET_BRANCHES = [
  { case: { $lte: ["$ageDays", 1] }, then: "0-1d" },
  { case: { $lte: ["$ageDays", 3] }, then: "2-3d" },
  { case: { $lte: ["$ageDays", 7] }, then: "4-7d" },
  { case: { $lte: ["$ageDays", 14] }, then: "8-14d" },
  { case: { $lte: ["$ageDays", 30] }, then: "15-30d" },
];

/** Derives an age bucket into `field`; caller supplies the preceding $match. */
const ageBucketStages = (to, timezone, field) => [
  {
    $addFields: {
      ageDays: {
        $dateDiff: {
          startDate: "$createdAt",
          endDate: to,
          unit: "day",
          timezone,
        },
      },
    },
  },
  {
    $addFields: {
      [field]: {
        $switch: { branches: AGE_BUCKET_BRANCHES, default: "30d+" },
      },
    },
  },
];

export const statsData = {
  createdVsResolvedSeries: async ({ from, to, format, timezone }) => {
    const [result] = await Complaint.aggregate([
      {
        $facet: {
          created: [
            { $match: { createdAt: { $gte: from, $lt: to } } },
            {
              $group: {
                _id: {
                  $dateToString: { format, date: "$createdAt", timezone },
                },
                created: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          resolved: [
            {
              $match: {
                status: "resolved",
                completedAt: { $ne: null, $gte: from, $lt: to },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format, date: "$completedAt", timezone },
                },
                resolved: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    return {
      createdRows: result?.created ?? [],
      resolvedRows: result?.resolved ?? [],
    };
  },

  createdVsResolvedDrilldown: ({ from, to }) =>
    Promise.all([
      drilldown({ createdAt: { $gte: from, $lt: to } }, { createdAt: -1, complaintId: -1 }),
      drilldown(
        { status: "resolved", completedAt: { $ne: null, $gte: from, $lt: to } },
        { completedAt: -1, complaintId: -1 },
      ),
    ]),

  statusCounts: ({ from, to }) =>
    Complaint.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

  statusDrilldown: ({ status, from, to }) =>
    drilldown({ createdAt: { $gte: from, $lt: to }, status }, { createdAt: -1 }),

  storeLeaderboard: ({ from, to, limit }) =>
    Complaint.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: "$store",
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
          unresolved: {
            $sum: { $cond: [{ $ne: ["$status", "resolved"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "_id",
          foreignField: "_id",
          as: "storeDoc",
        },
      },
      {
        $addFields: {
          storeName: { $ifNull: [{ $first: "$storeDoc.name" }, "Unknown"] },
        },
      },
      // Inclusion-only: mixing 1 and 0 in one $project is rejected by MongoDB.
      {
        $project: {
          _id: 0,
          storeName: 1,
          total: 1,
          resolved: 1,
          unresolved: 1,
        },
      },
      { $sort: { total: -1, unresolved: -1, storeName: 1 } },
      { $limit: Math.max(1, Math.min(Number(limit) || 10, 50)) },
    ]),

  storeLeaderboardDrilldown: async ({ storeName, from, to }) => {
    const stores = await Store.find({
      name: new RegExp(`^${escapeRegex(String(storeName || "").trim())}$`, "i"),
    }).select("_id");

    return drilldown(
      {
        createdAt: { $gte: from, $lt: to },
        store: { $in: stores.map((s) => s._id) },
      },
      { createdAt: -1 },
    );
  },

  timeToResolveSeries: ({ from, to, format, timezone }) =>
    Complaint.aggregate([
      { $addFields: { resolvedDate: { $ifNull: ["$completedAt", "$resolvedAt"] } } },
      {
        $match: {
          status: "resolved",
          resolvedDate: { $ne: null, $gte: from, $lt: to },
          createdAt: { $ne: null },
        },
      },
      {
        $project: {
          resolvedDate: 1,
          minutesToResolve: {
            $dateDiff: {
              startDate: "$createdAt",
              endDate: "$resolvedDate",
              unit: "minute",
              timezone,
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format, date: "$resolvedDate", timezone } },
          avgMinutes: { $avg: "$minutesToResolve" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: "$_id",
          count: 1,
          avgHours: { $divide: ["$avgMinutes", 60] },
        },
      },
    ]),

  timeToResolveDrilldown: ({ from, to }) =>
    drilldown(
      {
        status: "resolved",
        createdAt: { $ne: null },
        $or: [
          { completedAt: { $ne: null, $gte: from, $lt: to } },
          { completedAt: null, resolvedAt: { $ne: null, $gte: from, $lt: to } },
        ],
      },
      { completedAt: -1, resolvedAt: -1 },
    ),

  agingBuckets: ({ from, to, timezone }) =>
    Complaint.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: "resolved" } } },
      ...ageBucketStages(to, timezone, "bucket"),
      { $group: { _id: "$bucket", count: { $sum: 1 } } },
      { $project: { _id: 0, bucket: "$_id", count: 1 } },
    ]),

  agingDrilldown: async ({ bucket, from, to, timezone }) => {
    const matched = await Complaint.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: "resolved" } } },
      ...ageBucketStages(to, timezone, "_bucket"),
      { $match: { _bucket: bucket } },
      { $project: { _id: 1 } },
    ]);

    return drilldown({ _id: { $in: matched.map((d) => d._id) } }, { createdAt: -1 });
  },

  techniciansAssignedVsResolved: async ({ from, to }) => {
    const [result] = await Complaint.aggregate([
      {
        $facet: {
          assigned: [
            {
              $match: {
                assignedTechnician: { $ne: null },
                assignedAt: { $ne: null, $gte: from, $lt: to },
              },
            },
            { $group: { _id: "$assignedTechnician", assigned: { $sum: 1 } } },
          ],
          resolved: [
            {
              $match: {
                assignedTechnician: { $ne: null },
                status: "resolved",
                completedAt: { $ne: null, $gte: from, $lt: to },
              },
            },
            { $group: { _id: "$assignedTechnician", resolved: { $sum: 1 } } },
          ],
        },
      },
    ]);

    return {
      assignedRows: result?.assigned ?? [],
      resolvedRows: result?.resolved ?? [],
    };
  },

  findTechniciansByIds: (ids) =>
    User.find({ _id: { $in: ids }, role: "technician" }).select(
      "name phoneNumber",
    ),

  technicianDrilldown: ({ technicianId, from, to }) =>
    Promise.all([
      drilldown(
        {
          assignedTechnician: technicianId,
          assignedAt: { $ne: null, $gte: from, $lt: to },
        },
        { assignedAt: -1 },
      ),
      drilldown(
        {
          assignedTechnician: technicianId,
          status: "resolved",
          completedAt: { $ne: null, $gte: from, $lt: to },
        },
        { completedAt: -1 },
      ),
    ]),
};
