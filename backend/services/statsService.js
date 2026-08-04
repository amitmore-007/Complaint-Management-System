import { statsData } from "../data/statsData.js";

/**
 * Analytics shaping. Every query lives in data/statsData.js; this file turns
 * raw rows into the shapes the report cards expect.
 */

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

/** Outer-join two period-keyed series into one sorted timeline. */
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
    a.period.localeCompare(b.period),
  );
};

export const getComplaintsCreatedVsResolved = async ({
  from,
  to,
  interval,
  timezone,
}) =>
  mergeTimeSeries(
    await statsData.createdVsResolvedSeries({
      from,
      to,
      format: periodFormatByInterval(interval),
      timezone,
    }),
  );

export const getComplaintsCreatedVsResolvedDrilldown = async ({ from, to }) => {
  const [created, resolved] = await statsData.createdVsResolvedDrilldown({
    from,
    to,
  });

  return { created, resolved };
};

export const getComplaintsStatusFunnel = async ({ from, to }) => {
  const rows = await statsData.statusCounts({ from, to });
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

export const getComplaintsStatusFunnelDrilldown = ({ status, from, to }) =>
  statsData.statusDrilldown({ status, from, to });

export const getComplaintsStoreLeaderboard = ({ from, to, limit = 10 }) =>
  statsData.storeLeaderboard({ from, to, limit });

export const getComplaintsStoreLeaderboardDrilldown = async ({
  storeName,
  from,
  to,
}) => {
  const complaints = await statsData.storeLeaderboardDrilldown({
    storeName,
    from,
    to,
  });

  return {
    total: complaints,
    resolved: complaints.filter((c) => c.status === "resolved"),
    unresolved: complaints.filter((c) => c.status !== "resolved"),
  };
};

export const getComplaintsTimeToResolve = ({ from, to, interval, timezone }) =>
  statsData.timeToResolveSeries({
    from,
    to,
    format: periodFormatByInterval(interval),
    timezone,
  });

export const getComplaintsTimeToResolveDrilldown = async ({ from, to }) => {
  const complaints = await statsData.timeToResolveDrilldown({ from, to });

  return complaints.map((c) => {
    const resolvedDate = c.completedAt || c.resolvedAt;
    const hoursToResolve =
      resolvedDate && c.createdAt
        ? Math.round(
            ((new Date(resolvedDate).getTime() -
              new Date(c.createdAt).getTime()) /
              (1000 * 60 * 60)) *
              10,
          ) / 10
        : null;

    return { ...c, hoursToResolve };
  });
};

const AGING_BUCKET_ORDER = ["0-1d", "2-3d", "4-7d", "8-14d", "15-30d", "30d+"];

export const getComplaintsAgingBuckets = async ({ from, to, timezone }) => {
  const rows = await statsData.agingBuckets({ from, to, timezone });
  const map = new Map(rows.map((r) => [r.bucket, r.count || 0]));

  // Every bucket appears, even at zero, so the chart keeps a stable x-axis.
  return AGING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    count: map.get(bucket) || 0,
  }));
};

export const getComplaintsAgingDrilldown = ({ bucket, from, to, timezone }) =>
  statsData.agingDrilldown({ bucket, from, to, timezone });

export const getTechniciansAssignedVsResolved = async ({ from, to }) => {
  const { assignedRows, resolvedRows } =
    await statsData.techniciansAssignedVsResolved({ from, to });

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

  const entries = Array.from(map.values());
  const technicians = await statsData.findTechniciansByIds(
    entries.map((e) => e.technicianId),
  );
  const byId = new Map(technicians.map((t) => [String(t._id), t]));

  return entries
    .map((entry) => {
      const tech = byId.get(String(entry.technicianId));
      return {
        technicianId: entry.technicianId,
        technicianName: tech?.name || "Unknown",
        technicianPhoneNumber: tech?.phoneNumber,
        assigned: entry.assigned,
        resolved: entry.resolved,
      };
    })
    .sort((a, b) => b.assigned - a.assigned || b.resolved - a.resolved);
};

export const getTechnicianDrilldown = async ({ technicianId, from, to }) => {
  const [assigned, resolved] = await statsData.technicianDrilldown({
    technicianId,
    from,
    to,
  });

  return { assigned, resolved };
};
