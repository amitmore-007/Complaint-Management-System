import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ClipboardList, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

import {
  useAssignedComplaints,
  useResolvedComplaints,
} from "../../../../hooks/useComplaints";
import { useCreateBillingRecord } from "../../../../hooks/useBilling";

const buildBillingComplaints = (assigned, resolved) => {
  const active = Array.isArray(assigned) ? assigned : [];
  const done = Array.isArray(resolved) ? resolved : [];

  const byId = new Map();
  for (const complaint of [...active, ...done]) {
    if (complaint?._id) byId.set(complaint._id, complaint);
  }

  return Array.from(byId.values()).filter(
    (c) =>
      c.status === "assigned" ||
      c.status === "in-progress" ||
      c.status === "resolved"
  );
};

const SubmitBillingTab = ({ isDarkMode, submittedQuery }) => {
  const location = useLocation();

  const [openComplaintId, setOpenComplaintId] = useState(null);
  const [formByComplaintId, setFormByComplaintId] = useState({});

  const assignmentsQuery = useAssignedComplaints();
  const resolvedQuery = useResolvedComplaints();
  const createBillingMutation = useCreateBillingRecord();

  const requestedComplaintId = useMemo(() => {
    const stateId =
      location?.state?.complaintId || location?.state?.openComplaintId;
    const searchId = new URLSearchParams(location.search).get("complaintId");
    return stateId || searchId;
  }, [location.search, location.state]);

  const billingComplaints = useMemo(
    () => buildBillingComplaints(assignmentsQuery.data, resolvedQuery.data),
    [assignmentsQuery.data, resolvedQuery.data]
  );

  const submittedRecords = submittedQuery.data?.records ?? [];
  const submittedComplaintIds = useMemo(() => {
    return new Set(
      submittedRecords
        .map((r) => r?.complaint?._id ?? r?.complaint)
        .filter(Boolean)
        .map(String)
    );
  }, [submittedRecords]);

  const complaintsToSubmit = useMemo(() => {
    return billingComplaints.filter(
      (c) => !submittedComplaintIds.has(String(c._id))
    );
  }, [billingComplaints, submittedComplaintIds]);

  const isLoadingComplaints =
    assignmentsQuery.isLoading || resolvedQuery.isLoading;
  const isLoading = isLoadingComplaints || submittedQuery.isLoading;

  const ensureForm = (complaintId) => {
    setFormByComplaintId((prev) => {
      if (prev[complaintId]) return prev;
      return {
        ...prev,
        [complaintId]: {
          isComplaintResolved: false,
        },
      };
    });
  };

  const lastAutoOpenedIdRef = useRef(null);
  useEffect(() => {
    if (!requestedComplaintId) return;
    const id = String(requestedComplaintId);
    if (lastAutoOpenedIdRef.current === id) return;

    const hasLoaded = !isLoading;
    if (!hasLoaded) return;

    const inSubmitTab = complaintsToSubmit.some((c) => String(c?._id) === id);
    if (!inSubmitTab) {
      lastAutoOpenedIdRef.current = id;
      return;
    }

    ensureForm(id);
    setOpenComplaintId(id);
    lastAutoOpenedIdRef.current = id;
  }, [requestedComplaintId, complaintsToSubmit, isLoading]);

  const updateForm = (complaintId, patch) => {
    setFormByComplaintId((prev) => ({
      ...prev,
      [complaintId]: { ...prev[complaintId], ...patch },
    }));
  };

  const submitBilling = async (complaint) => {
    const complaintId = complaint?._id;
    if (!complaintId) return;

    ensureForm(complaintId);
    const form = formByComplaintId[complaintId];
    const safeForm = form || { isComplaintResolved: false };

    if (createBillingMutation.isPending) return;

    const formData = new FormData();
    formData.append("complaintId", complaintId);
    formData.append(
      "isComplaintResolved",
      String(!!safeForm.isComplaintResolved)
    );

    try {
      await createBillingMutation.mutateAsync(formData);
      toast.success("Billing record submitted");

      setFormByComplaintId((prev) => {
        const next = { ...prev };
        delete next[complaintId];
        return next;
      });
      setOpenComplaintId(null);

      submittedQuery.refetch();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to submit billing record"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (complaintsToSubmit.length === 0) {
    return (
      <div
        className={`p-8 rounded-2xl border text-center ${
          isDarkMode
            ? "bg-[#111] border-white/10 text-gray-300"
            : "bg-white border-gray-200 text-gray-700"
        }`}
      >
        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-70" />
        No pending billing submissions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaintsToSubmit.map((complaint) => {
        const cid = complaint._id;
        const isOpen = openComplaintId === cid;

        const form = formByComplaintId[cid];
        const resolved = !!form?.isComplaintResolved;
        const materials = complaint.materialsUsed
          ? complaint.materials ?? []
          : [];

        return (
          <div
            key={cid}
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              isDarkMode
                ? "bg-[#111] border-white/10"
                : "bg-white border-gray-200"
            }`}
          >
            <button
              onClick={() => {
                ensureForm(cid);
                setOpenComplaintId((prev) => (prev === cid ? null : cid));
              }}
              className="w-full text-left p-5 flex items-center justify-between"
              type="button"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <FileText
                    className={`${
                      isDarkMode ? "text-blue-300" : "text-blue-600"
                    }`}
                  />
                  <h3
                    className={`font-bold text-lg ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {complaint.title}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isDarkMode
                        ? "bg-white/10 text-gray-300"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {complaint.complaintId}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <span className="font-semibold">Location:</span>{" "}
                  {complaint.store?.name}
                </p>
                <p
                  className={`text-sm line-clamp-2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {complaint.description}
                </p>
              </div>

              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  isOpen ? "rotate-180" : "rotate-0"
                } ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`border-t ${
                    isDarkMode ? "border-white/10" : "border-gray-200"
                  }`}
                >
                  <div className="p-5 space-y-5">
                    <div
                      className={`p-4 rounded-2xl border ${
                        isDarkMode
                          ? "bg-[#111] border-white/10"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p
                        className={`font-semibold mb-3 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Is the complaint resolved?
                      </p>
                      <div className="flex items-center gap-3">
                        <label
                          className={`flex items-center gap-2 text-sm font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`resolved_${cid}`}
                            checked={resolved === true}
                            onChange={() =>
                              updateForm(cid, { isComplaintResolved: true })
                            }
                          />
                          Yes
                        </label>
                        <label
                          className={`flex items-center gap-2 text-sm font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`resolved_${cid}`}
                            checked={resolved === false}
                            onChange={() =>
                              updateForm(cid, { isComplaintResolved: false })
                            }
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4
                        className={`font-bold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Materials Used
                      </h4>

                      {materials.length === 0 ? (
                        <div
                          className={`p-4 rounded-2xl border text-sm ${
                            isDarkMode
                              ? "bg-[#111] border-white/10 text-gray-300"
                              : "bg-gray-50 border-gray-200 text-gray-700"
                          }`}
                        >
                          No materials were recorded when this complaint was
                          resolved.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {materials.map((m, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-2xl border ${
                                isDarkMode
                                  ? "bg-[#111] border-white/10"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <p
                                className={`font-semibold ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {m.item?.itemName ?? "Unknown item"}
                              </p>
                              <p
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                Qty: {m.quantity}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => submitBilling(complaint)}
                        disabled={createBillingMutation.isPending}
                        className={`px-5 py-3 rounded-2xl font-bold transition-all ${
                          createBillingMutation.isPending
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:shadow-lg"
                        } ${
                          isDarkMode
                            ? "bg-blue-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                        type="button"
                      >
                        {createBillingMutation.isPending
                          ? "Submitting..."
                          : "Submit Billing"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default SubmitBillingTab;
