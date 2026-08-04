import { complaintData } from "../data/complaintData.js";
import { userData } from "../data/userData.js";

/** Parses the "YYYY-MM" filter into a createdAt range, or null for all-time. */
const monthRange = (month) => {
  const match = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]);

  return {
    $gte: new Date(year, monthIndex - 1, 1),
    $lt: new Date(year, monthIndex, 1),
  };
};

export const dashboardService = {
  getStats: async ({ month } = {}) => {
    const createdAt = monthRange(month);
    const scope = createdAt ? { createdAt } : {};

    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalClients,
      totalTechnicians,
      activeTechnicians,
      recentComplaints,
    ] = await Promise.all([
      complaintData.count(scope),
      complaintData.count({ ...scope, status: "pending" }),
      complaintData.count({ ...scope, status: "in-progress" }),
      complaintData.count({ ...scope, status: "resolved" }),
      userData.count({ role: "client", ...scope }),
      userData.count({ role: "technician", ...scope }),
      userData.count({ role: "technician", isActive: true, ...scope }),
      complaintData.listRecent({ createdAt, limit: 5 }),
    ]);

    return {
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalClients,
      totalTechnicians,
      activeTechnicians,
      recentComplaints,
    };
  },
};
