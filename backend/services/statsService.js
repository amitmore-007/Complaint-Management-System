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
    map.set(row._id, { period: row._id, created: row.created || 0, resolved: 0 });
  }

  for (const row of resolvedRows) {
    const existing = map.get(row._id);
    if (existing) {
      existing.resolved = row.resolved || 0;
    } else {
      map.set(row._id, { period: row._id, created: 0, resolved: row.resolved || 0 });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
};

export const getComplaintsCreatedVsResolved = async ({ from, to, interval, timezone }) => {
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
  const technicians = await Technician.find({ _id: { $in: ids } }).select("name phoneNumber");
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

  rows.sort((a, b) => (b.assigned - a.assigned) || (b.resolved - a.resolved));

  return rows;
};
