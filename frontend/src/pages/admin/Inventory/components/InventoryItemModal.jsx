import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { formatYmd } from "../../../../utils/helpers";

const emptyForm = () => ({
  itemName: "",
  purchaseDate: formatYmd(new Date()),
  unitRate: "",
  quantity: "",
  gstType: "non-gst",
  gstPercent: "",
});

const InventoryItemModal = ({
  open,
  initialData,
  catalogByKey,
  isSaving,
  isDarkMode,
  onClose,
  onSave,
  formatMoney,
}) => {
  const [form, setForm] = useState(emptyForm());

  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: isDarkMode ? "dark" : "light" } }),
    [isDarkMode],
  );

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        itemName: initialData.itemName ?? "",
        purchaseDate: initialData.purchaseDate
          ? formatYmd(new Date(initialData.purchaseDate))
          : formatYmd(new Date()),
        unitRate: initialData.unitRate ?? "",
        quantity: initialData.quantity ?? "",
        gstType: initialData.gstType ?? "non-gst",
        gstPercent: initialData.gstPercent ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initialData]);

  const nameKey = form.itemName.trim().toLowerCase();
  const lockedGst = nameKey ? catalogByKey[nameKey] : null;
  const effectiveGstType = lockedGst ? lockedGst.gstType : form.gstType;
  const effectiveGstPercent = lockedGst
    ? lockedGst.gstPercent
    : form.gstPercent;

  const unitRate = Number(form.unitRate) || 0;
  const quantity = Number(form.quantity) || 0;
  const subtotal = unitRate * quantity;
  const gstPercentNum =
    effectiveGstType === "gst" ? Number(effectiveGstPercent) || 0 : 0;
  const gstAmount =
    effectiveGstType === "gst" ? subtotal * (gstPercentNum / 100) : 0;
  const totalAmount = subtotal + gstAmount;

  const handleSave = () => {
    if (!form.itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!form.purchaseDate) {
      toast.error("Purchase date is required");
      return;
    }
    if (form.unitRate === "" || Number(form.unitRate) < 0) {
      toast.error("Unit rate must be a valid non-negative number");
      return;
    }
    if (form.quantity === "" || Number(form.quantity) < 0) {
      toast.error("Quantity must be a valid non-negative number");
      return;
    }
    if (effectiveGstType === "gst" && form.gstPercent === "" && !lockedGst) {
      toast.error("GST % is required for GST items");
      return;
    }

    onSave({
      itemName: form.itemName.trim(),
      purchaseDate: form.purchaseDate,
      unitRate: Number(form.unitRate),
      quantity: Number(form.quantity),
      gstType: effectiveGstType,
      gstPercent: gstPercentNum,
    });
  };

  const inputClass = `w-full px-3 py-2 rounded-xl border text-sm ${
    isDarkMode
      ? "bg-white/10 border-white/10 text-white placeholder:text-gray-600"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }`;
  const labelClass = `block text-sm font-semibold mb-1.5 ${
    isDarkMode ? "text-gray-300" : "text-gray-700"
  }`;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !isSaving && onClose()}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto ${
              isDarkMode
                ? "bg-[#111] border-white/10"
                : "bg-white border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200/10 flex items-start justify-between">
              <h3
                className={`text-xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {initialData ? "Edit Purchase Entry" : "Add Purchase Entry"}
              </h3>
              <button
                onClick={onClose}
                disabled={isSaving}
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
              <div>
                <label className={labelClass}>Item Name</label>
                <input
                  type="text"
                  value={form.itemName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, itemName: e.target.value }))
                  }
                  placeholder="e.g. Copper Wire"
                  className={inputClass}
                />
                {lockedGst ? (
                  <p
                    className={`mt-1 text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Existing item — GST is locked to{" "}
                    {lockedGst.gstType === "gst"
                      ? `GST ${lockedGst.gstPercent}%`
                      : "Non-GST"}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Purchase Date</label>
                  <ThemeProvider theme={muiTheme}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        value={
                          form.purchaseDate ? dayjs(form.purchaseDate) : null
                        }
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            purchaseDate: value
                              ? value.format("YYYY-MM-DD")
                              : "",
                          }))
                        }
                        slotProps={{
                          textField: { size: "small", fullWidth: true },
                        }}
                      />
                    </LocalizationProvider>
                  </ThemeProvider>
                </div>
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    placeholder="Qty"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Unit Rate</label>
                <input
                  type="number"
                  value={form.unitRate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unitRate: e.target.value }))
                  }
                  placeholder="Rate per unit"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>GST Type</label>
                <div className="flex items-center gap-4">
                  <label
                    className={`flex items-center gap-2 text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } ${lockedGst ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      disabled={!!lockedGst}
                      checked={effectiveGstType === "gst"}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, gstType: "gst" }))
                      }
                    />
                    GST
                  </label>
                  <label
                    className={`flex items-center gap-2 text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } ${lockedGst ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      disabled={!!lockedGst}
                      checked={effectiveGstType === "non-gst"}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, gstType: "non-gst" }))
                      }
                    />
                    Non-GST
                  </label>
                </div>
              </div>

              {effectiveGstType === "gst" ? (
                <div>
                  <label className={labelClass}>GST %</label>
                  <input
                    type="number"
                    disabled={!!lockedGst}
                    value={lockedGst ? lockedGst.gstPercent : form.gstPercent}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        gstPercent: e.target.value,
                      }))
                    }
                    placeholder="e.g. 18"
                    className={`${inputClass} ${lockedGst ? "opacity-60" : ""}`}
                  />
                </div>
              ) : null}

              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  isDarkMode
                    ? "bg-[#111] border-white/10"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    Subtotal
                  </span>
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span
                    className={isDarkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    GST Amount{" "}
                    {effectiveGstType === "gst" ? `(${gstPercentNum}%)` : ""}
                  </span>
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                    {formatMoney(gstAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold pt-1 border-t border-gray-200/10">
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                    Total Amount
                  </span>
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                    {formatMoney(totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
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
                onClick={handleSave}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-xl font-bold text-white transition-all ${
                  isSaving ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg"
                } bg-blue-600`}
                type="button"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default InventoryItemModal;
