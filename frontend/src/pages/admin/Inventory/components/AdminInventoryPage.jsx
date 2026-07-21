import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Package,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { formatMoneyINR } from "../../../../utils/helpers";
import {
  useAdminInventoryItems,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from "../../../../hooks/useInventory";

import InventoryItemModal from "./InventoryItemModal";
import StockBalanceTable from "./StockBalanceTable";

const StatCard = ({ icon: Icon, label, value, isDarkMode }) => (
  <div
    className={`p-4 rounded-2xl border flex items-center gap-3 ${
      isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
    }`}
  >
    <div
      className={`p-2.5 rounded-xl ${
        isDarkMode ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-600"
      }`}
    >
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p
        className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
      >
        {label}
      </p>
      <p
        className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  </div>
);

const AdminInventoryPage = ({ isDarkMode }) => {
  const inventoryQuery = useAdminInventoryItems({ page: 1, limit: 100 });
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  const [modal, setModal] = useState({ open: false, record: null });
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("purchases");

  const records = useMemo(
    () => inventoryQuery.data?.records ?? [],
    [inventoryQuery.data],
  );
  const summary = inventoryQuery.data?.summary ?? {
    totalPurchaseValue: 0,
    gstValue: 0,
    nonGstValue: 0,
  };

  const catalogByKey = useMemo(() => {
    // Excludes the record currently being edited so its own sole entry
    // can still have its GST type corrected, matching backend behavior.
    const map = {};
    for (const r of records) {
      if (modal.record && r._id === modal.record._id) continue;
      const key = String(r.itemName || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (!map[key]) {
        map[key] = { gstType: r.gstType, gstPercent: r.gstPercent };
      }
    }
    return map;
  }, [records, modal.record]);

  const openCreateModal = () => setModal({ open: true, record: null });
  const openEditModal = (record) => setModal({ open: true, record });
  const closeModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModal({ open: false, record: null });
  };

  const handleSave = async (payload) => {
    try {
      if (modal.record) {
        await updateMutation.mutateAsync({ id: modal.record._id, payload });
        toast.success("Inventory item updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Inventory item added");
      }
      closeModal();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save inventory item",
      );
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteMutation.mutateAsync(record._id);
      toast.success("Inventory item deleted");
      setDeleteRecord(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to delete inventory item",
      );
    }
  };

  const openDeleteModal = (record) => setDeleteRecord(record);
  const closeDeleteModal = () => {
    if (deleteMutation.isPending) return;
    setDeleteRecord(null);
  };

  if (inventoryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Wallet}
          label="Total Purchase Value"
          value={formatMoneyINR(summary.totalPurchaseValue)}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={Receipt}
          label="GST Value"
          value={formatMoneyINR(summary.gstValue)}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={Package}
          label="Non-GST Value"
          value={formatMoneyINR(summary.nonGstValue)}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className={`inline-flex p-1 rounded-xl border ${
            isDarkMode
              ? "bg-[#111] border-white/10"
              : "bg-gray-100 border-gray-200"
          }`}
        >
          {[
            { key: "purchases", label: "Purchase Entries" },
            { key: "stock-balance", label: "Stock Balance" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : isDarkMode
                    ? "text-gray-300 hover:bg-white/5"
                    : "text-gray-600 hover:bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "purchases" && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:shadow-lg transition-all"
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add Purchase Entry
          </button>
        )}
      </div>

      {activeTab === "stock-balance" ? (
        <StockBalanceTable isDarkMode={isDarkMode} />
      ) : records.length === 0 ? (
        <div
          className={`p-8 rounded-2xl border text-center ${
            isDarkMode
              ? "bg-[#111] border-white/10 text-gray-300"
              : "bg-white border-gray-200 text-gray-700"
          }`}
        >
          No inventory items added yet.
        </div>
      ) : (
        <div
          className={`rounded-2xl border overflow-x-auto ${
            isDarkMode
              ? "bg-[#111] border-white/10"
              : "bg-white border-gray-200"
          }`}
        >
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr
                className={`text-xs font-bold uppercase ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <th className="text-left px-4 py-3">Purchase Date</th>
                <th className="text-left px-4 py-3">Item Name</th>
                <th className="text-right px-4 py-3">Unit Rate</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Subtotal</th>
                <th className="text-right px-4 py-3">GST %</th>
                <th className="text-right px-4 py-3">GST Amount</th>
                <th className="text-right px-4 py-3">Total Amount</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r._id}
                  className={`border-t ${
                    isDarkMode ? "border-white/10" : "border-gray-100"
                  }`}
                >
                  <td
                    className={`px-4 py-3 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {new Date(r.purchaseDate).toLocaleDateString("en-IN")}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {r.itemName}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {formatMoneyINR(r.unitRate)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {r.quantity}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {formatMoneyINR(r.subtotal)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {r.gstType === "gst" ? `${r.gstPercent}%` : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {formatMoneyINR(r.gstAmount)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {formatMoneyINR(r.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(r)}
                        className={`p-2 rounded-xl border ${
                          isDarkMode
                            ? "border-white/10 text-gray-200 hover:bg-white/5"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(r)}
                        className={`p-2 rounded-xl border ${
                          isDarkMode
                            ? "border-white/10 text-red-300 hover:bg-white/5"
                            : "border-gray-200 text-red-600 hover:bg-red-50"
                        }`}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InventoryItemModal
        open={modal.open}
        initialData={modal.record}
        catalogByKey={catalogByKey}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isDarkMode={isDarkMode}
        onClose={closeModal}
        onSave={handleSave}
        formatMoney={formatMoneyINR}
      />

      <AnimatePresence>
        {deleteRecord
          ? createPortal(
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-0"
                onClick={closeDeleteModal}
              >
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden -mt-12 sm:-mt-16 ${
                    isDarkMode
                      ? "bg-[#111] border-white/10"
                      : "bg-white border-gray-200"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-gray-200/10 flex items-start justify-between">
                    <div>
                      <h3
                        className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                      >
                        Delete Purchase Entry
                      </h3>
                      <p
                        className={`mt-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {deleteRecord.itemName}
                      </p>
                    </div>
                    <button
                      onClick={closeDeleteModal}
                      disabled={deleteMutation.isPending}
                      className={`p-2 rounded-xl ${
                        isDarkMode
                          ? "text-gray-300 hover:bg-white/5"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      type="button"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div
                      className={`p-4 rounded-2xl border ${
                        isDarkMode
                          ? "bg-red-500/10 border-red-500/20"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <p
                        className={`text-sm ${isDarkMode ? "text-red-200" : "text-red-700"}`}
                      >
                        This will permanently delete the purchase entry and
                        remove it from the inventory list.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={closeDeleteModal}
                        disabled={deleteMutation.isPending}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold ${
                          isDarkMode
                            ? "border-white/10 text-gray-200 hover:bg-white/5"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(deleteRecord)}
                        disabled={deleteMutation.isPending}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-700 transition-colors ${
                          deleteMutation.isPending
                            ? "opacity-60 cursor-not-allowed"
                            : ""
                        }`}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>,
              document.body,
            )
          : null}
      </AnimatePresence>
    </>
  );
};

export default AdminInventoryPage;
