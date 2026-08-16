import React from "react";
import { AlertTriangle, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useGeofenceFlaggedComplaints } from "../../hooks/useComplaints";

/**
 * Every status update that failed its on-site check, in either mode.
 *
 * This is what makes "Record only" worth running: it collects the real
 * distances so an admin can tell a mis-set radius from an actual off-site
 * resolve, before enforcement is switched on.
 */

const FAILURE_LABELS = {
  OUT_OF_RANGE: "Too far from store",
  NO_LOCATION: "No location sent",
  WEAK_SIGNAL: "GPS too weak",
  STALE_FIX: "Stale location",
  IMPLAUSIBLE_SPEED: "Impossible travel speed",
};

/** Why the device could not produce a fix, when it could not. */
const CLIENT_ERROR_LABELS = {
  PERMISSION_DENIED: "location blocked on device",
  TIMEOUT: "device timed out finding a fix",
  POSITION_UNAVAILABLE: "device could not get a fix",
  INSECURE_CONTEXT: "page not served over https",
  UNSUPPORTED: "device cannot report location",
};

const ACTION_LABELS = { start: "Started", resolve: "Resolved" };

/**
 * Newest attempt first. The list is capped server-side at 10, and older
 * complaints predate it — those fall back to the single stored reading.
 */
const attemptsFor = (complaint) => {
  const attempts = Array.isArray(complaint.geofenceAttempts)
    ? [...complaint.geofenceAttempts].reverse()
    : [];

  if (attempts.length) return attempts;

  return [
    { action: "start", reading: complaint.startLocation },
    { action: "resolve", reading: complaint.resolveLocation },
  ].filter((entry) => entry.reading?.withinGeofence === false);
};

const formatDistance = (metres) =>
  metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;

const EventRow = ({ action, event, storeName, isDarkMode }) => {
  if (!event) return null;

  const label = ACTION_LABELS[action] ?? action;
  const clientReason = CLIENT_ERROR_LABELS[event.clientErrorCode];
  const timestamp = event.capturedAt ?? event.recordedAt;

  return (
    <div
      className={`rounded-lg px-3 py-2.5 text-sm ${
        isDarkMode ? "bg-red-900/20" : "bg-red-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`font-semibold ${
            isDarkMode ? "text-red-300" : "text-red-700"
          }`}
        >
          {label}
        </span>
        <span className={isDarkMode ? "text-red-300/80" : "text-red-600"}>
          {FAILURE_LABELS[event.failureCode] ?? event.failureCode}
          {clientReason ? ` — ${clientReason}` : ""}
        </span>
        {Number.isFinite(event.distanceMeters) && (
          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
            {formatDistance(event.distanceMeters)} from {storeName}
          </span>
        )}
        {Number.isFinite(event.accuracyMeters) && (
          <span className={isDarkMode ? "text-gray-500" : "text-gray-500"}>
            ±{Math.round(event.accuracyMeters)}m accuracy
          </span>
        )}
        {event.mode && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              isDarkMode
                ? "bg-white/10 text-gray-300"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {event.mode === "enforce" ? "blocked" : "recorded only"}
          </span>
        )}
        {event.queuedOffline && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              isDarkMode
                ? "bg-white/10 text-gray-300"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            synced offline
          </span>
        )}
      </div>

      <div
        className={`mt-1.5 flex flex-wrap items-center gap-x-3 text-xs ${
          isDarkMode ? "text-gray-500" : "text-gray-500"
        }`}
      >
        {timestamp && <span>{new Date(timestamp).toLocaleString()}</span>}
        {Number.isFinite(event.lat) && Number.isFinite(event.lng) && (
          <a
            href={`https://www.google.com/maps?q=${event.lat},${event.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View on map
          </a>
        )}
      </div>
    </div>
  );
};

const GeofenceReview = () => {
  const { isDarkMode } = useTheme();
  const { data: complaints = [], isLoading } = useGeofenceFlaggedComplaints();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isDarkMode ? "bg-amber-900/40" : "bg-amber-50"
            }`}
          >
            <ShieldAlert
              className={`h-6 w-6 ${
                isDarkMode ? "text-amber-400" : "text-amber-600"
              }`}
            />
          </div>
          <div>
            <h1
              className={`text-2xl sm:text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Location Review
            </h1>
            <p
              className={`text-sm mt-0.5 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Complaints where a technician started or resolved work away from
              the store. Distances are straight-line, so they read shorter than
              the walking or driving distance Google Maps shows.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : complaints.length === 0 ? (
          <div
            className={`text-center py-16 rounded-2xl border ${
              isDarkMode
                ? "bg-[#111] border-white/10"
                : "bg-white border-gray-200"
            }`}
          >
            <MapPin
              className={`h-12 w-12 mx-auto mb-4 ${
                isDarkMode ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <p
              className={`text-lg font-medium ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Nothing flagged
            </p>
            <p
              className={`text-sm mt-1 ${
                isDarkMode ? "text-gray-500" : "text-gray-500"
              }`}
            >
              Every status update so far passed its on-site check.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <div
                key={complaint._id}
                className={`border rounded-xl p-4 sm:p-5 ${
                  isDarkMode
                    ? "bg-[#111] border-white/10"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3
                      className={`font-semibold truncate ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {complaint.title}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {complaint.complaintId} · {complaint.store?.name ?? "—"} ·{" "}
                      {complaint.assignedTechnician?.name ?? "Unassigned"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isDarkMode
                        ? "bg-amber-900/30 text-amber-300"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {complaint.status.replace("-", " ")}
                  </span>
                </div>

                <div className="space-y-2">
                  {attemptsFor(complaint).map((attempt, index) => (
                    <EventRow
                      key={index}
                      action={attempt.action}
                      event={attempt.reading}
                      storeName={complaint.store?.name ?? "store"}
                      isDarkMode={isDarkMode}
                    />
                  ))}
                </div>

                {!complaint.store?.location?.coordinates?.length && (
                  <p
                    className={`mt-3 text-xs ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    This store is no longer pinned, so it is not being checked
                    now.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GeofenceReview;
