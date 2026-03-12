import React, { useEffect, useMemo, useState } from "react";
import Drawer from "@mui/material/Drawer";
import { ExternalLink, Loader2, MapPin, User, UserCheck, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useComplaintsCreatedVsResolvedDrilldownStats } from "../../../../hooks/useStats";
import { formatPeriodLabel } from "../../../../utils/helpers";

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCreatorLabel = (complaint) => {
  if (complaint?.client?.name) return complaint.client.name;
  if (complaint?.createdByTechnician?.name) {
    return complaint.createdByTechnician.name;
  }
  if (complaint?.createdByAdmin?.name) return complaint.createdByAdmin.name;
  return "Unknown";
};

const statusTone = (status, isDarkMode) => {
  switch (status) {
    case "pending":
      return isDarkMode
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
        : "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "assigned":
      return isDarkMode
        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
        : "bg-blue-50 text-blue-700 border-blue-200";
    case "in-progress":
      return isDarkMode
        ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
        : "bg-orange-50 text-orange-700 border-orange-200";
    case "resolved":
      return isDarkMode
        ? "bg-green-500/15 text-green-300 border-green-500/30"
        : "bg-green-50 text-green-700 border-green-200";
    default:
      return isDarkMode
        ? "bg-gray-800 text-gray-300 border-gray-700"
        : "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const priorityTone = (priority, isDarkMode) => {
  switch (priority) {
    case "urgent":
      return isDarkMode ? "text-red-300" : "text-red-600";
    case "high":
      return isDarkMode ? "text-orange-300" : "text-orange-600";
    case "medium":
      return isDarkMode ? "text-yellow-300" : "text-yellow-600";
    case "low":
      return isDarkMode ? "text-green-300" : "text-green-600";
    default:
      return isDarkMode ? "text-gray-300" : "text-gray-600";
  }
};

const ComplaintRow = ({ complaint, type, isDarkMode }) => {
  const eventLabel = type === "resolved" ? "Resolved" : "Created";
  const eventTime = type === "resolved" ? complaint.completedAt : complaint.createdAt;

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        isDarkMode
          ? "bg-gray-900/80 border-gray-800"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold tracking-[0.18em] uppercase ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {complaint.complaintId}
          </p>
          <h4
            className={`mt-1 text-sm font-semibold leading-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {complaint.title}
          </h4>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(
            complaint.status,
            isDarkMode
          )}`}
        >
          {complaint.status}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className={`${priorityTone(complaint.priority, isDarkMode)} font-semibold capitalize`}>
          {complaint.priority || "medium"} priority
        </span>
        <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
          {eventLabel}: {formatDateTime(eventTime)}
        </span>
      </div>

      <div className="grid gap-2 text-sm">
        <div className={`flex items-start gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{complaint?.store?.name || complaint.location || "Unknown store"}</span>
        </div>
        <div className={`flex items-start gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          <User className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Raised by {getCreatorLabel(complaint)}</span>
        </div>
        <div className={`flex items-start gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {complaint?.assignedTechnician?.name
              ? `Assigned to ${complaint.assignedTechnician.name}`
              : "Not assigned yet"}
          </span>
        </div>
      </div>

      {complaint.description ? (
        <p
          className={`line-clamp-3 text-sm leading-6 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {complaint.description}
        </p>
      ) : null}

      <div className="pt-1">
        <Link
          to="/admin/complaints"
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
            isDarkMode
              ? "border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-900"
              : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Open complaints page
        </Link>
      </div>
    </div>
  );
};

const ComplaintsDrilldownDrawer = ({
  drilldown,
  onClose,
  isDarkMode,
  timezone,
}) => {
  const [activeTab, setActiveTab] = useState(drilldown?.defaultTab || "created");

  useEffect(() => {
    setActiveTab(drilldown?.defaultTab || "created");
  }, [drilldown]);

  const query = useMemo(() => {
    if (!drilldown?.interval || !drilldown?.period) return null;

    return {
      interval: drilldown.interval,
      period: drilldown.period,
      tz: timezone,
    };
  }, [drilldown, timezone]);

  const statsQuery = useComplaintsCreatedVsResolvedDrilldownStats(query, {
    enabled: Boolean(query),
  });

  const created = statsQuery.data?.data?.created || [];
  const resolved = statsQuery.data?.data?.resolved || [];

  const tabs = [
    { key: "created", label: "Created", count: created.length },
    { key: "resolved", label: "Resolved", count: resolved.length },
  ];

  const activeRows = activeTab === "resolved" ? resolved : created;
  const title = drilldown
    ? formatPeriodLabel(drilldown.period, drilldown.interval)
    : "";

  if (!drilldown) return null;

  return (
    <Drawer
      anchor="right"
      open={Boolean(drilldown)}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: 920,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          backgroundImage: "none",
          backgroundColor: isDarkMode ? "#000000" : "#f9fafb",
          color: isDarkMode ? "#ffffff" : "#111827",
          borderLeft: isDarkMode
            ? "1px solid rgb(31 41 55)"
            : "1px solid rgb(229 231 235)",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(1px)",
          },
        },
      }}
    >
      <div
        className={`flex h-full w-full flex-col ${
          isDarkMode ? "bg-black text-white" : "bg-gray-50 text-gray-900"
        }`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6 ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}
        >
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Complaints
            </p>
            <h3 className="mt-1 text-xl font-semibold">{title}</h3>
            <p className={`mt-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Click between tabs to inspect complaints created or resolved in this bucket.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border p-2 transition-colors ${
              isDarkMode
                ? "border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-900"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`flex items-center gap-2 border-b px-5 py-3 sm:px-6 ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? isDarkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                    ? "bg-gray-900 text-gray-300 hover:bg-gray-800"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {statsQuery.isLoading || statsQuery.isFetching ? (
            <div className="flex h-full min-h-[220px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading complaints...
              </div>
            </div>
          ) : null}

          {!statsQuery.isLoading && !statsQuery.isFetching && statsQuery.isError ? (
            <div
              className={`rounded-2xl border px-4 py-5 text-sm ${
                isDarkMode
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              Failed to load complaints for this period.
            </div>
          ) : null}

          {!statsQuery.isLoading && !statsQuery.isFetching && !statsQuery.isError ? (
            activeRows.length > 0 ? (
              <div className="space-y-3">
                {activeRows.map((complaint) => (
                  <ComplaintRow
                    key={complaint._id}
                    complaint={complaint}
                    type={activeTab}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${
                  isDarkMode
                    ? "border-gray-700 bg-gray-950 text-gray-400"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                No {activeTab} complaints found for this period.
              </div>
            )
          ) : null}
        </div>
      </div>
    </Drawer>
  );
};

export default ComplaintsDrilldownDrawer;