import { Loader2, Send, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import StoreApprovalBadge from "../../../components/common/StoreApprovalBadge";
import {
  useApproveStoreVisit,
  useResendStoreApproval,
} from "../../../hooks/useComplaints";

const ACTIVE_STATUSES = ["assigned", "in-progress"];

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** Store approval status in the admin complaint details, with fallbacks. */
const StoreApprovalPanel = ({ complaint, isDarkMode }) => {
  const approveMutation = useApproveStoreVisit();
  const resendMutation = useResendStoreApproval();
  const approval = complaint.storeApproval;
  if (!approval) return null;

  const isActive = ACTIVE_STATUSES.includes(complaint.status);
  const muted = isDarkMode ? "text-gray-400" : "text-gray-600";
  const busy = approveMutation.isPending || resendMutation.isPending;

  const run = async (mutation, successMessage) => {
    try {
      await mutation.mutateAsync(complaint._id);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  const recipients = approval.recipients ?? [];
  const undelivered = recipients.filter((r) => r.delivered === false);

  return (
    <div
      className={`p-4 rounded-lg border ${
        isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h5 className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          Store Approval
        </h5>
        <StoreApprovalBadge approval={approval} isDarkMode={isDarkMode} />
      </div>

      <div className={`space-y-1 text-sm ${muted}`}>
        {recipients.length > 0 && (
          <p>
            <strong>Asked:</strong>{" "}
            {recipients.map((r) => `${r.name} (${r.phoneNumber})`).join(", ")}
            {approval.requestedAt && ` · ${formatDateTime(approval.requestedAt)}`}
          </p>
        )}
        {undelivered.length > 0 && (
          <p className="text-red-500">
            WhatsApp not delivered to {undelivered.map((r) => r.name).join(", ")}.
          </p>
        )}
        {approval.respondedAt && (
          <p>
            <strong>{approval.status === "declined" ? "Declined" : "Approved"} by:</strong>{" "}
            {approval.respondedBy?.name} · {formatDateTime(approval.respondedAt)}
          </p>
        )}
        {approval.reason && (
          <p>
            <strong>Reason:</strong> {approval.reason}
          </p>
        )}
      </div>

      {isActive && approval.status !== "approved" && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(approveMutation, "Visit approved and technician notified")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Approve on behalf
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(resendMutation, "Approval request sent again")}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-60 ${
              isDarkMode
                ? "border-white/10 text-gray-200 hover:bg-white/10"
                : "border-gray-300 text-gray-700 hover:bg-white"
            }`}
          >
            {resendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Resend request
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreApprovalPanel;
