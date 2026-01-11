import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Eye, Save, X } from "lucide-react";

const BillingRecordModal = ({
  open,
  record,
  editState,
  isDarkMode,
  isSaving,
  downloadingBillUrl,
  onClose,
  onSave,
  onUpdateMaterial,
  onDownloadBill,
  formatMoney,
}) => (
  <AnimatePresence>
    {open && record && editState ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden ${
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
                Billing Record
              </h3>
              <p
                className={`${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                } text-sm`}
              >
                {record.technician?.name} • {record.complaint?.complaintId} •{" "}
                {record.complaint?.title}
              </p>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border ${
                isDarkMode
                  ? "border-gray-800 text-gray-200 hover:bg-gray-900"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {editState.isComplaintResolved ? "Yes" : "No"}
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
                  Materials used
                </p>
                <p
                  className={`${
                    isDarkMode ? "text-white" : "text-gray-900"
                  } font-bold`}
                >
                  {editState.materialsUsed ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {editState.materialsUsed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4
                    className={`${
                      isDarkMode ? "text-white" : "text-gray-900"
                    } font-bold`}
                  >
                    Materials (Admin can edit)
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <div
                    className={`min-w-[900px] rounded-2xl border ${
                      isDarkMode
                        ? "bg-gray-900 border-gray-800"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold uppercase ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <div className="col-span-4">Name</div>
                      <div className="col-span-2">Quantity</div>
                      <div className="col-span-2">Price</div>
                      <div className="col-span-4">Bill</div>
                    </div>

                    <div className="space-y-2 px-4 pb-4">
                      {(editState.materials ?? []).map((m, idx) => (
                        <div
                          key={idx}
                          className={`grid grid-cols-12 gap-3 p-3 rounded-2xl border ${
                            isDarkMode
                              ? "bg-gray-950 border-gray-800"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="col-span-4">
                            <input
                              value={m.name}
                              onChange={(e) =>
                                onUpdateMaterial(idx, { name: e.target.value })
                              }
                              className={`w-full px-3 py-2 rounded-xl border text-sm ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-800 text-white"
                                  : "bg-white border-gray-200 text-gray-900"
                              }`}
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              value={m.quantity}
                              onChange={(e) =>
                                onUpdateMaterial(idx, {
                                  quantity: e.target.value,
                                })
                              }
                              className={`w-full px-3 py-2 rounded-xl border text-sm ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-800 text-white"
                                  : "bg-white border-gray-200 text-gray-900"
                              }`}
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              value={m.price}
                              onChange={(e) =>
                                onUpdateMaterial(idx, { price: e.target.value })
                              }
                              className={`w-full px-3 py-2 rounded-xl border text-sm ${
                                isDarkMode
                                  ? "bg-gray-950 border-gray-800 text-white"
                                  : "bg-white border-gray-200 text-gray-900"
                              }`}
                            />
                          </div>

                          <div className="col-span-4 flex items-center">
                            {m.billPhoto?.url ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <a
                                  href={m.billPhoto.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
                                    isDarkMode
                                      ? "border-gray-800 text-gray-200 hover:bg-gray-900"
                                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                  } whitespace-nowrap`}
                                >
                                  <Eye className="h-4 w-4" />
                                  View bill
                                </a>

                                <button
                                  type="button"
                                  disabled={
                                    !!downloadingBillUrl &&
                                    downloadingBillUrl === m.billPhoto.url
                                  }
                                  onClick={() =>
                                    onDownloadBill(m.billPhoto.url, m.name)
                                  }
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
                                    downloadingBillUrl === m.billPhoto.url
                                      ? "opacity-60 cursor-not-allowed"
                                      : ""
                                  } ${
                                    isDarkMode
                                      ? "border-gray-800 text-gray-200 hover:bg-gray-900"
                                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                  } whitespace-nowrap`}
                                >
                                  <Download className="h-4 w-4" />
                                  {downloadingBillUrl === m.billPhoto.url
                                    ? "Downloading..."
                                    : "Download"}
                                </button>
                              </div>
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
                </div>
              </div>
            ) : (
              <div
                className={`p-5 rounded-2xl border ${
                  isDarkMode
                    ? "bg-gray-900 border-gray-800"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <p
                  className={`${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  } font-semibold`}
                >
                  No materials were used for this complaint.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <div
                className={`${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                } text-sm mr-auto`}
              >
                Total:{" "}
                {formatMoney(
                  (editState.materials ?? []).reduce(
                    (sum, m) =>
                      sum + Number(m.quantity || 0) * Number(m.price || 0),
                    0
                  )
                )}
              </div>

              <button
                onClick={onClose}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl border font-semibold ${
                  isDarkMode
                    ? "border-gray-800 text-gray-200 hover:bg-gray-900"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
                type="button"
              >
                Cancel
              </button>

              <button
                onClick={onSave}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl font-bold ${
                  isSaving ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg"
                } ${
                  isDarkMode
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                }`}
                type="button"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default BillingRecordModal;
