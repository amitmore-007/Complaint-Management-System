import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  Calendar,
  User,
  MapPin,
  Eye,
  Download,
  X,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  useEquipmentList,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useAssetRecords,
  useUpdateAssetRecord,
  useDeleteAssetRecord,
  useExportAssetRecords,
} from "../../hooks/useEquipment";
import api from "../../lib/axios";

const AdminAssets = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("manage");

  // React Query hooks
  const {
    data: equipment = [],
    isLoading: isLoadingEquipment,
    refetch: refetchEquipment,
  } = useEquipmentList();
  const {
    data: assetRecords = [],
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useAssetRecords();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();
  const updateRecordMutation = useUpdateAssetRecord();
  const deleteRecordMutation = useDeleteAssetRecord();
  const exportRecordsMutation = useExportAssetRecords();

  const isLoading =
    activeTab === "manage" ? isLoadingEquipment : isLoadingRecords;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [recordFormData, setRecordFormData] = useState({
    storeName: "",
    equipment: [],
    notes: "",
  });
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeManagers, setStoreManagers] = useState([]);
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const downloadAssetRecordsExcel = async () => {
    try {
      const blob = await exportRecordsMutation.mutateAsync();

      const fileName = `asset-records-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Excel downloaded successfully");
    } catch (error) {
      console.error("Export asset records error:", error);
      toast.error(
        error.response?.data?.message || "Failed to export asset records"
      );
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.name || !formData.name.trim()) {
      toast.error("Please enter equipment name");
      return;
    }

    if (createEquipmentMutation.isPending) return;

    try {
      await createEquipmentMutation.mutateAsync({ name: formData.name.trim() });
      toast.success("Equipment added successfully");
      setShowAddModal(false);
      setFormData({ name: "" });
    } catch (error) {
      console.error("Add equipment error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to add equipment";
      toast.error(errorMessage);
    }
  };

  const handleEditEquipment = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.name || !formData.name.trim()) {
      toast.error("Please enter equipment name");
      return;
    }

    if (updateEquipmentMutation.isPending) return;

    try {
      await updateEquipmentMutation.mutateAsync({
        id: selectedEquipment._id,
        name: formData.name.trim(),
      });
      toast.success("Equipment updated successfully");
      setShowEditModal(false);
      setSelectedEquipment(null);
      setFormData({ name: "" });
    } catch (error) {
      console.error("Edit equipment error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update equipment";
      toast.error(errorMessage);
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (window.confirm("Are you sure you want to delete this equipment?")) {
      try {
        await deleteEquipmentMutation.mutateAsync(id);
        toast.success("Equipment deleted successfully");
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to delete equipment"
        );
      }
    }
  };

  const openEditModal = (item) => {
    setSelectedEquipment(item);
    setFormData({
      name: item.name,
    });
    setShowEditModal(true);
  };

  const openRecordModal = async (record) => {
    try {
      const response = await api.get(`/equipment/records/${record._id}`);
      setSelectedRecord(response.data.record);
      setShowRecordModal(true);
    } catch (error) {
      toast.error("Failed to fetch record details");
    }
  };

  const openEditRecordModal = async (record) => {
    setSelectedRecord(record);
    setRecordFormData({
      storeName: record.storeName,
      equipment: record.equipment || [],
      notes: record.notes || "",
    });
    setSelectedStore(null);
    setStoreManagers([]);
    setShowEditRecordModal(true);

    try {
      setIsStoreLoading(true);
      const res = await api.get("/stores", {
        params: { name: record.storeName },
      });
      const store = res.data?.store || null;
      setSelectedStore(store);
      setStoreManagers(store?.managers || []);
    } catch (error) {
      console.error("Store fetch error:", error);
      setSelectedStore(null);
      setStoreManagers([]);
    } finally {
      setIsStoreLoading(false);
    }
  };

  const addStoreManager = () => {
    setStoreManagers((prev) => [...prev, { name: "", phoneNumber: "" }]);
  };

  const removeStoreManager = (index) => {
    setStoreManagers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStoreManager = (index, field, value) => {
    setStoreManagers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleEditRecord = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!recordFormData.storeName || !recordFormData.storeName.trim()) {
      toast.error("Please enter store name");
      return;
    }

    if (updateRecordMutation.isPending) return;

    try {
      await updateRecordMutation.mutateAsync({
        id: selectedRecord._id,
        ...recordFormData,
      });

      // Persist store managers for this store (best-effort).
      try {
        let store = selectedStore;
        const storeNameTrimmed = recordFormData.storeName?.trim();

        // If store name was changed, lookup the new store.
        if (
          !store ||
          String(store.name).toLowerCase() !==
            String(storeNameTrimmed).toLowerCase()
        ) {
          const lookup = await api.get("/stores", {
            params: { name: storeNameTrimmed },
          });
          store = lookup.data?.store || null;

          if (!store) {
            const upsert = await api.post("/stores/upsert", {
              storeName: storeNameTrimmed,
            });
            store = upsert.data?.store || null;
          }

          setSelectedStore(store);
        }

        if (store?._id) {
          await api.put(`/stores/${store._id}/managers`, {
            managers: storeManagers,
          });
        }
      } catch (storeSaveError) {
        console.error("Store manager save error:", storeSaveError);
        // Don't block record save; just inform.
        toast.error(
          storeSaveError.response?.data?.message ||
            "Record updated, but failed to save outlet managers"
        );
      }

      toast.success("Asset record updated successfully");
      setShowEditRecordModal(false);
      setSelectedRecord(null);
      setRecordFormData({ storeName: "", equipment: [], notes: "" });
      setSelectedStore(null);
      setStoreManagers([]);
    } catch (error) {
      console.error("Edit record error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update record";
      toast.error(errorMessage);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this asset record? This action cannot be undone."
      )
    ) {
      try {
        await deleteRecordMutation.mutateAsync(id);
        toast.success("Asset record deleted successfully");
      } catch (error) {
        console.error("Delete record error:", error);
        toast.error(error.response?.data?.message || "Failed to delete record");
      }
    }
  };

  const handleEquipmentChange = (index, field, value) => {
    const updatedEquipment = [...recordFormData.equipment];
    updatedEquipment[index] = {
      ...updatedEquipment[index],
      [field]: value,
    };
    setRecordFormData((prev) => ({ ...prev, equipment: updatedEquipment }));
  };

  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords = assetRecords.filter(
    (record) =>
      record.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.technician?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Asset Management
            </h1>
            <p
              className={`mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Manage equipment and view submission records
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`flex space-x-1 rounded-xl p-1 ${
            isDarkMode ? "bg-gray-800/50" : "bg-gray-100"
          }`}
        >
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "manage"
                ? "bg-blue-600 text-white shadow-lg"
                : isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            Manage List
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "records"
                ? "bg-blue-600 text-white shadow-lg"
                : isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            View Submitted Records
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "manage" ? (
            <motion.div
              key="manage"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Search and Add */}
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center space-x-2 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Equipment</span>
                </button>
              </div>

              {/* Equipment List */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEquipment.map((item) => (
                    <motion.div
                      key={item._id}
                      className={`border rounded-xl p-6 transition-colors ${
                        isDarkMode
                          ? "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isDarkMode ? "bg-blue-600/20" : "bg-blue-100"
                            }`}
                          >
                            <Package
                              className={`h-6 w-6 ${
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div>
                            <h3
                              className={`font-semibold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {item.name}
                            </h3>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                                : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEquipment(item._id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="records"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Search + Export */}
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search by store or technician..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>

                <button
                  onClick={downloadAssetRecordsExcel}
                  disabled={exportRecordsMutation.isPending}
                  className={`px-6 py-3 rounded-xl font-medium flex items-center space-x-2 transition-colors ${
                    exportRecordsMutation.isPending
                      ? isDarkMode
                        ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  title="Download all asset records as Excel"
                >
                  <Download className="h-5 w-5" />
                  <span>
                    {exportRecordsMutation.isPending
                      ? "Downloading..."
                      : "Download Excel"}
                  </span>
                </button>
              </div>

              {/* Records List */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredRecords.map((record) => (
                    <motion.div
                      key={record._id}
                      className={`border rounded-xl p-6 transition-colors ${
                        isDarkMode
                          ? "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                      }`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3
                            className={`font-semibold text-lg ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {record.storeName}
                          </h3>
                          <div
                            className={`flex items-center space-x-4 mt-2 text-sm ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{record.technician?.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(
                                  record.submissionDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRecordModal(record);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? "text-blue-400 hover:bg-blue-500/10"
                                : "text-blue-600 hover:bg-blue-50"
                            }`}
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRecordModal(record);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                                : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            }`}
                            title="Edit Record"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecord(record._id);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode
                                ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`text-sm ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        <span className="font-medium">
                          {record.equipment?.length || 0}
                        </span>{" "}
                        equipment items recorded
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Equipment Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              style={{
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`rounded-2xl p-6 w-full max-w-md mx-4 my-4 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  className={`text-xl font-bold mb-6 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Add New Equipment
                </h2>
                <form onSubmit={handleAddEquipment} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Equipment Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
                      placeholder="Enter equipment name"
                      className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setFormData({ name: "" });
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    >
                      Add Equipment
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Equipment Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              style={{
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`rounded-2xl p-6 w-full max-w-md mx-4 my-4 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  className={`text-xl font-bold mb-6 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Edit Equipment
                </h2>
                <form onSubmit={handleEditEquipment} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Equipment Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
                      placeholder="Enter equipment name"
                      className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedEquipment(null);
                        setFormData({ name: "" });
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    >
                      Update Equipment
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Record Detail Modal */}
        <AnimatePresence>
          {showRecordModal && selectedRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              style={{
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={() => setShowRecordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`rounded-2xl p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto mx-4 my-4 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2
                      className={`text-2xl font-bold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedRecord.storeName}
                    </h2>
                    <div
                      className={`flex items-center space-x-4 mt-2 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <span>By: {selectedRecord.technician?.name}</span>
                      <span>•</span>
                      <span>
                        {new Date(
                          selectedRecord.submissionDate
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div
                      className={`mt-3 text-sm ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      <span className="font-semibold">Outlet Managers:</span>{" "}
                      <span>
                        {(() => {
                          const managers = selectedRecord?.store?.managers;

                          if (
                            !Array.isArray(managers) ||
                            managers.length === 0
                          ) {
                            return "-";
                          }

                          const namedManagers = managers.filter(
                            (m) => m?.name && String(m.name).trim()
                          );

                          if (namedManagers.length === 0) return "-";

                          return namedManagers
                            .map((m) =>
                              m.phoneNumber
                                ? `${m.name} (${m.phoneNumber})`
                                : m.name
                            )
                            .join(", ");
                        })()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRecordModal(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:text-white hover:bg-gray-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedRecord.equipment?.map((item, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-4 rounded-xl border ${
                        item.isPresent
                          ? "bg-green-500/10 border-green-500/30"
                          : isDarkMode
                          ? "bg-gray-700/50 border-gray-600"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.isPresent
                              ? "bg-green-500"
                              : isDarkMode
                              ? "bg-gray-600"
                              : "bg-gray-400"
                          }`}
                        >
                          {item.isPresent ? (
                            <Check className="h-5 w-5 text-white" />
                          ) : (
                            <X className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      {item.isPresent && (
                        <span
                          className={`font-semibold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Count: {item.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {selectedRecord.notes && (
                  <div
                    className={`mt-6 p-4 rounded-xl ${
                      isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    <h4
                      className={`font-semibold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Notes:
                    </h4>
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                    >
                      {selectedRecord.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Record Modal */}
        <AnimatePresence>
          {showEditRecordModal && selectedRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              style={{
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={() => setShowEditRecordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`rounded-2xl p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-4 my-4 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  className={`text-xl font-bold mb-6 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Edit Asset Record
                </h2>

                <form onSubmit={handleEditRecord} className="space-y-4">
                  {/* Store Name */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={recordFormData.storeName}
                      onChange={(e) =>
                        setRecordFormData((prev) => ({
                          ...prev,
                          storeName: e.target.value,
                        }))
                      }
                      placeholder="Enter store name"
                      className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                  </div>

                  {/* Outlet Managers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className={`block text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Outlet Managers (Name + Contact)
                      </label>
                      <button
                        type="button"
                        onClick={addStoreManager}
                        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isDarkMode
                            ? "bg-gray-700 hover:bg-gray-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add</span>
                      </button>
                    </div>

                    {isStoreLoading ? (
                      <p
                        className={
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }
                      >
                        Loading store contacts...
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {storeManagers.length === 0 && (
                          <p
                            className={
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                          >
                            No outlet managers added.
                          </p>
                        )}

                        {storeManagers.map((m, index) => (
                          <div
                            key={index}
                            className={`p-4 border rounded-xl ${
                              isDarkMode
                                ? "bg-gray-700/50 border-gray-600"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) =>
                                  updateStoreManager(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="Manager name"
                                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                                  isDarkMode
                                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                                }`}
                              />
                              <input
                                type="text"
                                value={m.phoneNumber}
                                onChange={(e) =>
                                  updateStoreManager(
                                    index,
                                    "phoneNumber",
                                    e.target.value
                                  )
                                }
                                placeholder="Contact number"
                                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                                  isDarkMode
                                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                                }`}
                              />
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeStoreManager(index)}
                                className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isDarkMode
                                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                                }`}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Equipment Items */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Equipment Items
                    </label>
                    <div className="space-y-3">
                      {recordFormData.equipment?.map((item, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-xl ${
                            isDarkMode
                              ? "bg-gray-700/50 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`font-medium ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {item.name}
                            </span>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={item.isPresent}
                                onChange={(e) =>
                                  handleEquipmentChange(
                                    index,
                                    "isPresent",
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-300" : "text-gray-700"
                                }`}
                              >
                                Present
                              </span>
                            </label>
                          </div>
                          {item.isPresent && (
                            <input
                              type="number"
                              min="0"
                              value={item.count || 0}
                              onChange={(e) =>
                                handleEquipmentChange(
                                  index,
                                  "count",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="Count"
                              className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                                isDarkMode
                                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Notes (Optional)
                    </label>
                    <textarea
                      value={recordFormData.notes}
                      onChange={(e) =>
                        setRecordFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Additional notes..."
                      className={`w-full px-4 py-3 border rounded-xl transition-colors resize-none ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditRecordModal(false);
                        setSelectedRecord(null);
                        setRecordFormData({
                          storeName: "",
                          equipment: [],
                          notes: "",
                        });
                        setSelectedStore(null);
                        setStoreManagers([]);
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateRecordMutation.isPending}
                      className={`flex-1 py-3 px-4 rounded-xl transition-colors inline-flex items-center justify-center gap-2 ${
                        updateRecordMutation.isPending
                          ? "bg-blue-600/70 text-white cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {updateRecordMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span>
                        {updateRecordMutation.isPending
                          ? "Updating..."
                          : "Update Record"}
                      </span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default AdminAssets;
