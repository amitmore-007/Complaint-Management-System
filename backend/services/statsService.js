import Complaint from "../models/Complaint.js";
import Technician from "../models/Technician.js";

const periodFormatByInterval = (interval) => {
  switch (interval) {
    case "day":
      return "%Y-%m-%d";
    case "year":
      return "%Y";
    case "month":
    default:
      return "%Y-%m";
  }
};

const mergeTimeSeries = ({ createdRows, resolvedRows }) => {
  const map = new Map();

  for (const row of createdRows) {
    map.set(row._id, {
      period: row._id,
      created: row.created || 0,
      resolved: 0,
    });
  }

  for (const row of resolvedRows) {
    const existing = map.get(row._id);
    if (existing) {
      existing.resolved = row.resolved || 0;
    } else {
      map.set(row._id, {
        period: row._id,
        created: 0,
        resolved: row.resolved || 0,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
};

export const getComplaintsCreatedVsResolved = async ({
  from,
  to,
  interval,
  timezone,
}) => {
  const format = periodFormatByInterval(interval);

  const [result] = await Complaint.aggregate([
    {
      $facet: {
        created: [
          {
            $match: {
              createdAt: { $gte: from, $lt: to },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format,
                  date: "$createdAt",
                  timezone,
                },
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
                $dateToString: {
                  format,
                  date: "$completedAt",
                  timezone,
                },
              },
              resolved: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const createdRows = result?.created || [];
  const resolvedRows = result?.resolved || [];

  return mergeTimeSeries({ createdRows, resolvedRows });
};

export const getComplaintsStatusFunnel = async ({ from, to }) => {
  const rows = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map(rows.map((r) => [r._id, r.count || 0]));

  const pending = map.get("pending") || 0;
  const assigned = map.get("assigned") || 0;
  const inProgress = map.get("in-progress") || 0;
  const resolved = map.get("resolved") || 0;

  return {
    pending,
    assigned,
    inProgress,
    resolved,
    total: pending + assigned + inProgress + resolved,
  };
};

export const getComplaintsStoreLeaderboard = async ({
  from,
  to,
  limit = 10,
}) => {
  const rows = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $addFields: {
        locationTrim: {
          $trim: {
            input: { $ifNull: ["$location", ""] },
          },
        },
      },
    },
    {
      $addFields: {
        locationKey: { $toLower: "$locationTrim" },
        locationLabel: {
          $cond: [
            { $gt: [{ $strLenCP: "$locationTrim" }, 0] },
            "$locationTrim",
            "Unknown",
          ],
        },
      },
    },
    {
      $group: {
        _id: "$locationKey",
        storeName: { $first: "$locationLabel" },
        total: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
          },
        },
        unresolved: {
          $sum: {
            $cond: [{ $ne: ["$status", "resolved"] }, 1, 0],
          },
        },
      },
    },
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
  ]);

  return rows;
};

export const getComplaintsTimeToResolve = async ({
  from,
  to,
  interval,
  timezone,
}) => {
  const format = periodFormatByInterval(interval);

  const rows = await Complaint.aggregate([
    {
      $addFields: {
        resolvedDate: { $ifNull: ["$completedAt", "$resolvedAt"] },
      },
    },
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
        _id: {
          $dateToString: {
            format,
            date: "$resolvedDate",
            timezone,
          },
        },
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
        avgHours: {
          $divide: ["$avgMinutes", 60],
        },
      },
    },
  ]);

  return rows;
};

export const getComplaintsAgingBuckets = async ({ from, to, timezone }) => {
  const rows = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        status: { $ne: "resolved" },
      },
    },
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
        bucket: {
          $switch: {
            branches: [
              { case: { $lte: ["$ageDays", 1] }, then: "0-1d" },
              { case: { $lte: ["$ageDays", 3] }, then: "2-3d" },
              { case: { $lte: ["$ageDays", 7] }, then: "4-7d" },
              { case: { $lte: ["$ageDays", 14] }, then: "8-14d" },
              { case: { $lte: ["$ageDays", 30] }, then: "15-30d" },
            ],
            default: "30d+",
          },
        },
      },
    },
    {
      $group: {
        _id: "$bucket",
        count: { $sum: 1 },
      },
    },
    {
      $addFields: {
        sortKey: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", "0-1d"] }, then: 1 },
              { case: { $eq: ["$_id", "2-3d"] }, then: 2 },
              { case: { $eq: ["$_id", "4-7d"] }, then: 3 },
              { case: { $eq: ["$_id", "8-14d"] }, then: 4 },
              { case: { $eq: ["$_id", "15-30d"] }, then: 5 },
              { case: { $eq: ["$_id", "30d+"] }, then: 6 },
            ],
            default: 99,
          },
        },
      },
    },
    { $sort: { sortKey: 1 } },
    {
      $project: {
        _id: 0,
        bucket: "$_id",
        count: 1,
      },
    },
  ]);

  // Ensure all buckets exist, even if count is 0
  const order = ["0-1d", "2-3d", "4-7d", "8-14d", "15-30d", "30d+"];
  const map = new Map(rows.map((r) => [r.bucket, r.count || 0]));
  return order.map((b) => ({ bucket: b, count: map.get(b) || 0 }));
};

export const getTechniciansAssignedVsResolved = async ({ from, to }) => {
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
          {
            $group: {
              _id: "$assignedTechnician",
              assigned: { $sum: 1 },
            },
          },
        ],
        resolved: [
          {
            $match: {
              assignedTechnician: { $ne: null },
              status: "resolved",
              completedAt: { $ne: null, $gte: from, $lt: to },
            },
          },
          {
            $group: {
              _id: "$assignedTechnician",
              resolved: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const assignedRows = result?.assigned || [];
  const resolvedRows = result?.resolved || [];

  const map = new Map();

  for (const row of assignedRows) {
    map.set(String(row._id), {
      technicianId: row._id,
      assigned: row.assigned || 0,
      resolved: 0,
    });
  }

  for (const row of resolvedRows) {
    const key = String(row._id);
    const existing = map.get(key);
    if (existing) {
      existing.resolved = row.resolved || 0;
    } else {
      map.set(key, {
        technicianId: row._id,
        assigned: 0,
        resolved: row.resolved || 0,
      });
    }
  }

  const ids = Array.from(map.values()).map((x) => x.technicianId);
  const technicians = await Technician.find({ _id: { $in: ids } }).select(
    "name phoneNumber"
  );
  const techMap = new Map(technicians.map((t) => [String(t._id), t]));

  const rows = Array.from(map.values()).map((x) => {
    const tech = techMap.get(String(x.technicianId));
    return {
      technicianId: x.technicianId,
      technicianName: tech?.name || "Unknown",
      technicianPhoneNumber: tech?.phoneNumber,
      assigned: x.assigned,
      resolved: x.resolved,
    };
  });

  rows.sort((a, b) => b.assigned - a.assigned || b.resolved - a.resolved);

  return rows;
};
