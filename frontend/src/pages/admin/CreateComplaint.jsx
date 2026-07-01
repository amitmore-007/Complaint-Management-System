import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import {
  Upload,
  X,
  FileText,
  ChevronDown,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { STORE_OPTIONS } from "../../utils/storeOptions";
import StoreDropdown from "../../components/common/StoreDropdown";
import {
  useCreateAdminComplaint,
  useCreateAdminBulkComplaints,
} from "../../hooks/useComplaints";

const PRIORITIES = ["low", "medium", "high", "urgent"];

const createEmptyRow = () => ({
  id: Math.random().toString(36).substr(2, 9),
  title: "",
  description: "",
  location: "",
  priority: "medium",
});

const CreateComplaint = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // mode: "single" | "bulk"
  const [mode, setMode] = useState("single");

  // ── Single mode state ──────────────────────────────────────
  const [photos, setPhotos] = useState([]);
  const createComplaintMutation = useCreateAdminComplaint();
  const isSubmitting = createComplaintMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();
  const selectedLocation = watch("location");

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (photos.length + acceptedFiles.length > 5) {
        toast.error("Maximum 5 photos allowed");
        return;
      }
      setPhotos((prev) => [
        ...prev,
        ...acceptedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
          id: Math.random().toString(36).substr(2, 9),
        })),
      ]);
    },
    [photos]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"] },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
  });

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const onSingleSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("priority", data.priority);
      photos.forEach((p) => formData.append("photos", p.file));

      await createComplaintMutation.mutateAsync(formData);
      toast.success("Complaint created successfully!");
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      navigate("/admin/complaints");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create complaint");
    }
  };

  // ── Bulk mode state ────────────────────────────────────────
  const [bulkRows, setBulkRows] = useState([createEmptyRow()]);
  const [bulkErrors, setBulkErrors] = useState({});
  const [bulkResults, setBulkResults] = useState(null);
  const createBulkMutation = useCreateAdminBulkComplaints();
  const isBulkSubmitting = createBulkMutation.isPending;

  const addRow = () => setBulkRows((prev) => [...prev, createEmptyRow()]);

  const removeRow = (id) =>
    setBulkRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id, field, value) => {
    setBulkRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    if (bulkErrors[id]?.[field]) {
      setBulkErrors((prev) => {
        const next = { ...prev };
        delete next[id]?.[field];
        return next;
      });
    }
  };

  const validateBulkRows = () => {
    const errors = {};
    let valid = true;
    bulkRows.forEach((row) => {
      const rowErrors = {};
      if (!row.title.trim()) { rowErrors.title = "Required"; valid = false; }
      if (!row.description.trim()) { rowErrors.description = "Required"; valid = false; }
      if (!row.location) { rowErrors.location = "Required"; valid = false; }
      if (Object.keys(rowErrors).length) errors[row.id] = rowErrors;
    });
    setBulkErrors(errors);
    return valid;
  };

  const onBulkSubmit = async () => {
    if (!validateBulkRows()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const complaints = bulkRows.map((r) => ({
        title: r.title.trim(),
        description: r.description.trim(),
        location: r.location,
        priority: r.priority,
      }));
      const result = await createBulkMutation.mutateAsync(complaints);
      setBulkResults(result.results);
      const { created, failed } = result.summary;
      if (failed === 0) {
        toast.success(`All ${created} complaints created!`);
      } else {
        toast(`${created} created, ${failed} failed`, { icon: "⚠️" });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create complaints");
    }
  };

  const resetBulk = () => {
    setBulkRows([createEmptyRow()]);
    setBulkErrors({});
    setBulkResults(null);
  };

  const cardCls = `rounded-xl border p-5 ${
    isDarkMode ? "bg-[#161616] border-white/10" : "bg-gray-50 border-gray-200"
  }`;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center space-x-2 mb-4 text-sm ${
              isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
            } transition-colors`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <h1 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Create Complaint
          </h1>
        </div>

        {/* Mode toggle */}
        <div
          className={`flex rounded-lg p-1 mb-6 w-fit ${
            isDarkMode ? "bg-white/5 border border-white/10" : "bg-gray-100 border border-gray-200"
          }`}
        >
          {["single", "bulk"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setBulkResults(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 shadow-sm"
                  : isDarkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "bulk" && <Layers className="h-4 w-4" />}
              {m === "single" ? "Single Complaint" : "Bulk Complaints"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── SINGLE MODE ── */}
          {mode === "single" && (
            <motion.div
              key="single"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`p-8 rounded-2xl border ${
                isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
              }`}
            >
              <form onSubmit={handleSubmit(onSingleSubmit)} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Complaint Title *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register("title", { required: "Title is required" })}
                      type="text"
                      placeholder="Brief description of the issue"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 ${
                        isDarkMode
                          ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      }`}
                    />
                  </div>
                  {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Description *
                  </label>
                  <textarea
                    {...register("description", { required: "Description is required" })}
                    rows={4}
                    placeholder="Provide detailed information about the issue..."
                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-none ${
                      isDarkMode
                        ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    }`}
                  />
                  {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Store Name *
                  </label>
                  <input type="hidden" {...register("location", { required: "Store selection is required" })} />
                  <StoreDropdown
                    isDarkMode={isDarkMode}
                    options={STORE_OPTIONS}
                    value={selectedLocation}
                    onChange={(name) => setValue("location", name, { shouldValidate: true })}
                  />
                  {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      {...register("priority")}
                      className={`w-full pl-4 pr-10 py-3 border rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
                        isDarkMode
                          ? "bg-[#1a1a1a] border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      }`}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Photos (Optional)
                  </label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : isDarkMode
                        ? "border-white/10 hover:border-white/20 bg-white/5"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className={`h-8 w-8 mx-auto mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                    <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {isDragActive ? "Drop files here..." : "Drag & drop images here, or click to select"}
                    </p>
                    <p className="text-xs mt-1 text-gray-500">PNG, JPG, GIF up to 5MB each</p>
                  </div>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <img src={photo.preview} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-white/10" />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/dashboard")}
                    className={`flex-1 py-2.5 px-4 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isDarkMode
                        ? "border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Submit Complaint</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── BULK MODE ── */}
          {mode === "bulk" && (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {/* Results view */}
              {bulkResults ? (
                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"}`}>
                  <h2 className={`text-lg font-semibold mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    Bulk Submission Results
                  </h2>
                  <p className={`text-sm mb-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {bulkResults.filter((r) => r.success).length} of {bulkResults.length} complaints created successfully
                  </p>

                  <div className="space-y-2 mb-6">
                    {bulkResults.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                          r.success
                            ? isDarkMode ? "bg-green-900/20 border-green-700/30" : "bg-green-50 border-green-200"
                            : isDarkMode ? "bg-red-900/20 border-red-700/30" : "bg-red-50 border-red-200"
                        }`}
                      >
                        {r.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <span className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            Complaint {i + 1}
                          </span>
                          {r.success ? (
                            <span className="ml-2 text-green-600 dark:text-green-400">
                              Created — {r.complaint?.complaintId}
                            </span>
                          ) : (
                            <span className="ml-2 text-red-600 dark:text-red-400">{r.error}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetBulk}
                      className={`flex-1 py-2.5 px-4 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isDarkMode
                          ? "border-white/10 text-gray-300 hover:bg-white/10"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Create More
                    </button>
                    <button
                      onClick={() => navigate("/admin/complaints")}
                      className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-200"
                    >
                      View Complaints
                    </button>
                  </div>
                </div>
              ) : (
                /* Bulk entry form */
                <div className="space-y-4">
                  {bulkRows.map((row, index) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cardCls}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-sm font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                          Complaint {index + 1}
                        </span>
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Title *
                          </label>
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateRow(row.id, "title", e.target.value)}
                            placeholder="Brief description of the issue"
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                              isDarkMode
                                ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            }`}
                          />
                          {bulkErrors[row.id]?.title && (
                            <p className="mt-1 text-xs text-red-500">{bulkErrors[row.id].title}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Description *
                          </label>
                          <textarea
                            value={row.description}
                            onChange={(e) => updateRow(row.id, "description", e.target.value)}
                            rows={3}
                            placeholder="Provide detailed information about the issue..."
                            className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-none ${
                              isDarkMode
                                ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            }`}
                          />
                          {bulkErrors[row.id]?.description && (
                            <p className="mt-1 text-xs text-red-500">{bulkErrors[row.id].description}</p>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Store Name *
                          </label>
                          <StoreDropdown
                            isDarkMode={isDarkMode}
                            options={STORE_OPTIONS}
                            value={row.location}
                            onChange={(name) => updateRow(row.id, "location", name)}
                          />
                          {bulkErrors[row.id]?.location && (
                            <p className="mt-1 text-xs text-red-500">{bulkErrors[row.id].location}</p>
                          )}
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Priority
                          </label>
                          <div className="relative">
                            <select
                              value={row.priority}
                              onChange={(e) => updateRow(row.id, "priority", e.target.value)}
                              className={`w-full pl-4 pr-10 py-3 border rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
                                isDarkMode
                                  ? "bg-[#1a1a1a] border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              }`}
                            >
                              {PRIORITIES.map((p) => (
                                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <button
                    type="button"
                    onClick={addRow}
                    className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                      isDarkMode
                        ? "border-white/10 text-gray-400 hover:border-blue-500/40 hover:text-blue-400"
                        : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Complaint
                  </button>

                  <div className={`text-xs text-right ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {bulkRows.length} complaint{bulkRows.length !== 1 ? "s" : ""} in batch
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/dashboard")}
                      className={`flex-1 py-2.5 px-4 border rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isDarkMode
                          ? "border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onBulkSubmit}
                      disabled={isBulkSubmitting}
                      className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isBulkSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <>
                          <Layers className="h-4 w-4" />
                          <span>Submit {bulkRows.length} Complaint{bulkRows.length !== 1 ? "s" : ""}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default CreateComplaint;
