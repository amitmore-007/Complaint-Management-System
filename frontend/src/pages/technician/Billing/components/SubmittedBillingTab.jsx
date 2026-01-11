import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";
import { useLocation } from "react-router-dom";

import { formatMoneyINR } from "../../../../utils/helpers";

const SubmittedBillingTab = ({ isDarkMode, submittedQuery }) => {
  const location = useLocation();
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    record: null,
  });

  const submittedRecords = submittedQuery.data?.records ?? [];

  const requestedComplaintId = useMemo(() => {
    const stateId =
      location?.state?.complaintId || location?.state?.openComplaintId;
    const searchId = new URLSearchParams(location.search).get("complaintId");
    return stateId || searchId;
  }, [location.search, location.state]);

  const lastAutoOpenedIdRef = useRef(null);
  useEffect(() => {
    if (!requestedComplaintId) return;
    const id = String(requestedComplaintId);
    if (lastAutoOpenedIdRef.current === id) return;
    if (submittedQuery.isLoading) return;

    const record = submittedRecords.find(
      (r) => String(r?.complaint?._id ?? r?.complaint) === id
    );
    if (record) {
      setDetailsModal({ open: true, record });
      lastAutoOpenedIdRef.current = id;
    }
  }, [requestedComplaintId, submittedQuery.isLoading, submittedRecords]);

  if (submittedQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (submittedRecords.length === 0) {
    return (
      <div
        className={`p-8 rounded-2xl border text-center ${
          isDarkMode
            ? "bg-gray-900 border-gray-800 text-gray-300"
            : "bg-white border-gray-200 text-gray-700"
        }`}
      >
        No billing records submitted yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {submittedRecords.map((record) => {
          const total = (record.materials ?? []).reduce(
            (sum, m) => sum + Number(m.quantity || 0) * Number(m.price || 0),
            0
          );

          return (
            <div
              key={record._id}
              className={`p-5 rounded-2xl border shadow-sm ${
                isDarkMode
                  ? "bg-gray-900 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-sm font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {record.complaint?.title ?? "Complaint"}
                  </p>
                  <p
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {record.complaint?.complaintId} •{" "}
                    {record.complaint?.location}
                  </p>
                </div>

                <button
                  onClick={() => setDetailsModal({ open: true, record })}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
                    isDarkMode
                      ? "border-gray-800 text-gray-200 hover:bg-gray-800"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-2xl border ${
                    isDarkMode
                      ? "bg-gray-950 border-gray-800"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p
                    className={`${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    } text-xs`}
                  >
                    Material used
                  </p>
                  <p
                    className={`${
                      isDarkMode ? "text-white" : "text-gray-900"
                    } font-bold`}
                  >
                    {record.materialsUsed ? "Yes" : "No"}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-2xl border ${
                    isDarkMode
                      ? "bg-gray-950 border-gray-800"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p
                    className={`${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    } text-xs`}
                  >
                    Total
                  </p>
                  <p
                    className={`${
                      isDarkMode ? "text-white" : "text-gray-900"
                    } font-bold`}
                  >
                    {formatMoneyINR(total)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {detailsModal.open && detailsModal.record ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setDetailsModal({ open: false, record: null })}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden ${
                isDarkMode
                  ? "bg-gray-950 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200/10 flex items-start justify-between">
                <div>
                  <h3
                    className={`text-xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Billing Details
                  </h3>
                  <p
                    className={`${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    } text-sm`}
                  >
                    {detailsModal.record.complaint?.complaintId} •{" "}
                    {detailsModal.record.complaint?.title}
                  </p>
                </div>
                <button
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                    isDarkMode
                      ? "border-gray-800 text-gray-200 hover:bg-gray-900"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setDetailsModal({ open: false, record: null })}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      } text-xs`}
                    >
                      Complaint resolved
                    </p>
                    <p
                      className={`${
                        isDarkMode ? "text-white" : "text-gray-900"
                      } font-bold`}
                    >
                      {detailsModal.record.isComplaintResolved ? "Yes" : "No"}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p
                      className={`${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      } text-xs`}
                    >
                      Material used
                    </p>
                    <p
                      className={`${
                        isDarkMode ? "text-white" : "text-gray-900"
                      } font-bold`}
                    >
                      {detailsModal.record.materialsUsed ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                {detailsModal.record.materialsUsed ? (
                  <div className="space-y-2">
                    <p
                      className={`${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      } font-bold`}
                    >
                      Materials
                    </p>
                    <div className="space-y-2">
                      {(detailsModal.record.materials ?? []).map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                            isDarkMode
                              ? "bg-gray-900 border-gray-800"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div>
                            <p
                              className={`${
                                isDarkMode ? "text-white" : "text-gray-900"
                              } font-bold`}
                            >
                              {m.name}
                            </p>
                            <p
                              className={`${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              } text-sm`}
                            >
                              Qty: {m.quantity} • Price:{" "}
                              {formatMoneyINR(m.price)}
                            </p>
                          </div>
                          <div>
                            {m.billPhoto?.url ? (
                              <a
                                href={m.billPhoto.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
                                  isDarkMode
                                    ? "border-gray-800 text-gray-200 hover:bg-gray-800"
                                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <Eye className="h-4 w-4" />
                                View bill
                              </a>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                No bill
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default SubmittedBillingTab;
