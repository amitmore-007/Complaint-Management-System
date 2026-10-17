import { Clock, ShieldCheck, ShieldX } from "lucide-react";

const STYLES = {
  pending: {
    icon: Clock,
    label: "Awaiting store approval",
    light: "bg-amber-50 text-amber-700 border-amber-200",
    dark: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  },
  approved: {
    icon: ShieldCheck,
    label: "Store approved visit",
    light: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dark: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  },
  declined: {
    icon: ShieldX,
    label: "Store said not now",
    light: "bg-red-50 text-red-700 border-red-200",
    dark: "bg-red-500/10 text-red-300 border-red-500/30",
  },
};

/**
 * One-line pill with the store manager's answer to the technician's visit.
 * Renders nothing when the store has no contact marked "Approves visits".
 */
const StoreApprovalBadge = ({ approval, isDarkMode }) => {
  const style = approval && STYLES[approval.status];
  if (!style) return null;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${
        isDarkMode ? style.dark : style.light
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {style.label}
    </span>
  );
};

/**
 * Who declined the visit and why, as its own block under the card header —
 * kept out of the badge row so it never stretches the other pills.
 */
export const StoreApprovalNote = ({ approval, isDarkMode, className = "" }) => {
  if (approval?.status !== "declined") return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        isDarkMode
          ? "border-red-500/20 bg-red-500/5 text-red-200"
          : "border-red-200 bg-red-50 text-red-800"
      } ${className}`}
    >
      <ShieldX className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold">
          {approval.respondedBy?.name || "Store"} asked to hold the visit
        </span>
        {approval.reason && <>: &ldquo;{approval.reason}&rdquo;</>}
      </span>
    </div>
  );
};

export default StoreApprovalBadge;
