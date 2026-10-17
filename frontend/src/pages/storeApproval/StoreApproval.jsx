import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  Lock,
  MapPin,
  PauseCircle,
  Phone,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import { endpoints } from "../../api/endpoints";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// No auth: the link token is the credential. Separate instance so the app's
// auth interceptors (redirect on 401) never run here.
const publicApi = axios.create({ baseURL: API_BASE, timeout: 15000 });

const QUICK_REASONS = [
  "Store is busy right now",
  "Please come later today",
  "Please come tomorrow",
  "Manager not available",
];

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "T";

// ── Pieces ────────────────────────────────────────────────────────────────

const Header = () => (
  <header className="bg-white border-b border-slate-200">
    <div className="mx-auto max-w-lg px-4 h-16 flex items-center justify-between">
      <img
        src="/assets/Logo.png"
        alt="Constro-Energy Solution LLP"
        className="h-11 w-auto -ml-2 object-contain"
      />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
        <Lock className="h-3 w-3" />
        Secure link
      </span>
    </div>
  </header>
);

const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 px-4 py-3.5">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-0.5 text-[15px] font-medium text-slate-900 break-words">
        {children}
      </div>
    </div>
  </div>
);

const VisitDetails = ({ view }) => (
  <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
    {/* Technician */}
    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-base font-semibold shadow-sm">
        {initials(view.technician.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Assigned technician
        </p>
        <p className="text-base font-semibold text-slate-900 truncate">
          {view.technician.name || "Technician"}
        </p>
        {view.technician.phoneNumber && (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {view.technician.phoneNumber}
          </p>
        )}
      </div>
    </div>

    <div className="divide-y divide-slate-100">
      <DetailRow icon={MapPin} label="Store">
        {view.storeName || "-"}
      </DetailRow>
      <DetailRow icon={Wrench} label="Issue">
        {view.title}
      </DetailRow>
      <DetailRow icon={Hash} label="Complaint ID">
        <span className="font-mono text-sm">{view.complaintId}</span>
      </DetailRow>
      {view.assignedAt && (
        <DetailRow icon={CalendarClock} label="Assigned">
          {formatDateTime(view.assignedAt)}
        </DetailRow>
      )}
    </div>
  </section>
);

const OUTCOME_TONES = {
  green: {
    ring: "bg-emerald-50 ring-emerald-100",
    icon: "text-emerald-600",
  },
  amber: {
    ring: "bg-amber-50 ring-amber-100",
    icon: "text-amber-600",
  },
  slate: {
    ring: "bg-slate-100 ring-slate-200",
    icon: "text-slate-500",
  },
};

const Outcome = ({ icon: Icon, tone, title, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl bg-white border border-slate-200 shadow-sm px-5 py-7 text-center"
  >
    <div
      className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ring-8 ${OUTCOME_TONES[tone].ring}`}
    >
      <Icon className={`h-8 w-8 ${OUTCOME_TONES[tone].icon}`} />
    </div>
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    {children && (
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
    )}
  </motion.section>
);

const Skeleton = () => (
  <div className="space-y-4 animate-pulse" aria-label="Loading">
    <div className="h-7 w-2/3 rounded-lg bg-slate-200" />
    <div className="h-4 w-full rounded bg-slate-200" />
    <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded-lg bg-slate-100" />
      ))}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────

const StoreApproval = () => {
  const { token } = useParams();
  const [view, setView] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(null); // "approve" | "decline"
  const [submitError, setSubmitError] = useState("");

  const load = () =>
    publicApi
      .get(endpoints.storeApproval.byToken(token))
      .then(({ data }) => setView(data.approval));

  useEffect(() => {
    document.title = "Technician visit approval";
    load()
      .catch((error) =>
        setLoadError(
          error?.response?.data?.message ||
            "We couldn't load this request. Please check your connection and try again.",
        ),
      )
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const respond = async (decision) => {
    setSubmitting(decision);
    setSubmitError("");
    try {
      const { data } = await publicApi.post(endpoints.storeApproval.respond(token), {
        decision,
        reason: decision === "decline" ? reason : undefined,
      });
      setView(data.approval);
      setShowDecline(false);
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message || "Something went wrong. Please try again.",
      );
      // Someone else may have answered meanwhile; show the latest state.
      load().catch(() => {});
    } finally {
      setSubmitting(null);
    }
  };

  const approval = view?.approval;
  const canRespond =
    approval?.status === "pending" &&
    !approval.expired &&
    ["assigned", "in-progress"].includes(view?.complaintStatus);

  const renderOutcome = () => {
    if (approval.status === "approved") {
      return (
        <Outcome icon={CheckCircle2} tone="green" title="Visit approved">
          <p>
            Thank you. {view.technician.name || "The technician"} has been informed and
            will proceed with the visit.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            {approval.respondedBy} · {formatDateTime(approval.respondedAt)}
          </p>
        </Outcome>
      );
    }
    if (approval.status === "declined") {
      return (
        <Outcome icon={PauseCircle} tone="amber" title="Visit on hold">
          <p>
            We&apos;ve told the technician not to come for now. Our team will contact you
            to arrange a better time.
          </p>
          {approval.reason && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
              &ldquo;{approval.reason}&rdquo;
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            {approval.respondedBy} · {formatDateTime(approval.respondedAt)}
          </p>
        </Outcome>
      );
    }
    return (
      <Outcome icon={Clock} tone="slate" title="This request is closed">
        {approval.expired
          ? "This link has expired. If you need to change the visit, please contact our team."
          : "This complaint has already been resolved. No action is needed."}
      </Outcome>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main
        className={`flex-1 mx-auto w-full max-w-lg px-4 pt-6 ${
          // Room for the pinned action bar (taller with the decline form open).
          canRespond ? (showDecline ? "pb-96" : "pb-44") : "pb-10"
        }`}
      >
        {isLoading && <Skeleton />}

        {!isLoading && loadError && (
          <Outcome icon={ShieldAlert} tone="slate" title="Link not available">
            {loadError}
          </Outcome>
        )}

        {!isLoading && view && (
          <div className="space-y-5">
            <div>
              {canRespond && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Your response is needed
                </span>
              )}
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                Technician visit request
              </h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                {view.recipientName ? `Hi ${view.recipientName}, a` : "A"} technician has
                been assigned to a complaint at your store.
                {canRespond && " Please confirm whether they can visit."}
              </p>
            </div>

            {!canRespond && renderOutcome()}

            <VisitDetails view={view} />

            {!canRespond && submitError && (
              <p className="text-sm text-center text-slate-500">{submitError}</p>
            )}
          </div>
        )}
      </main>

      {/* Action bar — pinned to the bottom so it's always within thumb reach. */}
      {!isLoading && view && canRespond && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
          <div className="mx-auto max-w-lg px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <AnimatePresence mode="wait" initial={false}>
              {!showDecline ? (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="space-y-2.5"
                >
                  <button
                    type="button"
                    onClick={() => respond("approve")}
                    disabled={Boolean(submitting)}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-70"
                  >
                    {submitting === "approve" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                    Approve visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDecline(true)}
                    disabled={Boolean(submitting)}
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[15px] font-semibold transition-colors"
                  >
                    Not now
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="decline"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDecline(false)}
                      disabled={Boolean(submitting)}
                      aria-label="Back"
                      className="-ml-2 p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <p className="text-[15px] font-semibold text-slate-900">
                      Why should the visit wait?
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_REASONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setReason(option)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          reason === option
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Add a note (optional)"
                    className="w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-slate-900"
                  />

                  <button
                    type="button"
                    onClick={() => respond("decline")}
                    disabled={Boolean(submitting)}
                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                  >
                    {submitting === "decline" && <Loader2 className="h-5 w-5 animate-spin" />}
                    Put visit on hold
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {submitError && (
              <p className="mt-2.5 text-sm text-center text-red-600">{submitError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreApproval;
