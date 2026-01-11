import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  formatMoneyINR,
  downloadRemoteFile,
  slugifyFilePart,
} from "../../../../utils/helpers";
import {
  useAdminBillingRecords,
  useUpdateAdminBillingRecord,
} from "../../../../hooks/useBilling";

import BillingRecordCard from "./BillingRecordCard";
import BillingRecordModal from "./BillingRecordModal";

const AdminBillingPage = ({ isDarkMode }) => {
  const billingQuery = useAdminBillingRecords({ page: 1, limit: 100 });
  const updateMutation = useUpdateAdminBillingRecord();

  const [modal, setModal] = useState({ open: false, record: null });
  const [editState, setEditState] = useState(null);
  const [downloadingBillUrl, setDownloadingBillUrl] = useState(null);

  const records = useMemo(
    () => billingQuery.data?.records ?? [],
    [billingQuery.data]
  );

  const openModal = (record) => {
    setModal({ open: true, record });
    setEditState({
      id: record._id,
      isComplaintResolved: !!record.isComplaintResolved,
      materialsUsed: !!record.materialsUsed,
      materials: (record.materials ?? []).map((m) => ({
        name: m.name ?? "",
        quantity: m.quantity ?? 0,
        price: m.price ?? 0,
        billPhoto: m.billPhoto,
      })),
    });
  };

  const closeModal = () => {
    if (updateMutation.isPending) return;
    setModal({ open: false, record: null });
    setEditState(null);
  };

  const updateMaterial = (idx, patch) => {
    setEditState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        materials: (prev.materials ?? []).map((m, i) =>
          i === idx ? { ...m, ...patch } : m
        ),
      };
    });
  };

  const save = async () => {
    if (!editState?.id) return;

    const payload = {
      isComplaintResolved: !!editState.isComplaintResolved,
      materialsUsed: !!editState.materialsUsed,
      materials: (editState.materials ?? []).map((m) => ({
        name: String(m.name || "").trim(),
        quantity: Number(m.quantity || 0),
        price: Number(m.price || 0),
      })),
    };

    if (payload.materialsUsed) {
      const invalid = payload.materials.find((m) => !m.name);
      if (invalid) {
        toast.error("Material name is required");
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({ id: editState.id, payload });
      toast.success("Billing record updated");
      closeModal();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update billing record"
      );
    }
  };

  const handleDownloadBill = async (url, suggestedName) => {
    if (!url) return;
    if (downloadingBillUrl) return;

    setDownloadingBillUrl(url);
    try {
      const direct = await downloadRemoteFile(url, suggestedName);
      if (direct) {
        toast.success("Bill downloaded");
      } else {
        toast("Opened bill in a new tab", { icon: "ℹ️" });
      }
    } finally {
      setDownloadingBillUrl(null);
    }
  };

  if (billingQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div
        className={`p-8 rounded-2xl border text-center ${
          isDarkMode
            ? "bg-gray-900 border-gray-800 text-gray-300"
            : "bg-white border-gray-200 text-gray-700"
        }`}
      >
        No billing submissions yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {records.map((record) => (
          <BillingRecordCard
            key={record._id}
            record={record}
            isDarkMode={isDarkMode}
            onView={() => openModal(record)}
          />
        ))}
      </div>

      <BillingRecordModal
        open={modal.open}
        record={modal.record}
        editState={editState}
        isDarkMode={isDarkMode}
        isSaving={updateMutation.isPending}
        downloadingBillUrl={downloadingBillUrl}
        onClose={closeModal}
        onSave={save}
        onUpdateMaterial={updateMaterial}
        onDownloadBill={(url, materialName) => {
          const complaintId =
            modal.record?.complaint?.complaintId ||
            modal.record?.complaint?._id ||
            modal.record?._id;
          const safeMaterial = slugifyFilePart(materialName, "material");
          const filename = `bill-${complaintId}-${safeMaterial}.jpg`;
          handleDownloadBill(url, filename);
        }}
        formatMoney={formatMoneyINR}
      />
    </>
  );
};

export default AdminBillingPage;
