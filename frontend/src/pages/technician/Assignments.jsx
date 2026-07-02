import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Calendar,
  MapPin,
  User,
  Play,
  CheckSquare,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
  Share2,
  Search,
  ChevronDown,
} from "lucide-react";
import StoreDropdown from "../../components/common/StoreDropdown";
import STORE_OPTIONS from "../../utils/storeOptions";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuthStore from "../../store/authStore";
import {
  useAssignedComplaints,
  useUpdateComplaintStatus,
} from "../../hooks/useComplaints";

const TechnicianAssignments = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const assignmentsQuery = useAssignedComplaints();
  const updateStatusMutation = useUpdateComplaintStatus();

  const isLoading = assignmentsQuery.isLoading;

  const assignments = useMemo(() => {
    const all = Array.isArray(assignmentsQuery.data)
      ? assignmentsQuery.data
      : [];
    return all.filter(
      (complaint) =>
        complaint.status === "assigned" || complaint.status === "in-progress"
    );
  }, [assignmentsQuery.data]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolutionData, setResolutionData] = useState({
    notes: "",
    materialsUsed: "",
    photos: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartWorkConfirm, setShowStartWorkConfirm] = useState(false);
  const [pendingStartComplaint, setPendingStartComplaint] = useState(null);
  const [isStartingWork, setIsStartingWork] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const storeOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(STORE_OPTIONS) ? STORE_OPTIONS : []).forEach((name) => {
      const cleaned = String(name ?? "").trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (!map.has(key)) map.set(key, cleaned);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, []);

  const filteredAssignments = useMemo(() => {
    let filtered = assignments;

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    if (locationFilter !== "all") {
      const sel = String(locationFilter).trim().toLowerCase();
      filtered = filtered.filter((c) =>
        String(c?.store?.name ?? c?.location ?? "").trim().toLowerCase() === sel
      );
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          String(c.store?.name ?? "").toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.complaintId.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [assignments, statusFilter, priorityFilter, locationFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));

  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, locationFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!assignmentsQuery.isError) return;

    const message =
      assignmentsQuery.error?.response?.data?.message ||
      assignmentsQuery.error?.message ||
      "Failed to load assignments";

    toast.error(message);
  }, [assignmentsQuery.isError, assignmentsQuery.error]);

  const updateComplaintStatus = async (
    complaintId,
    newStatus,
    notes = "",
    resolutionData = null
  ) => {
    try {
      const formData = new FormData();

      // Ensure status is properly appended
      formData.append("status", newStatus);

      if (notes) {
        formData.append("notes", notes);
      }

      if (resolutionData) {
        if (resolutionData.notes) {
          formData.append("resolutionNotes", resolutionData.notes);
        }
        if (resolutionData.materialsUsed) {
          formData.append("materialsUsed", resolutionData.materialsUsed);
        }
        if (resolutionData.photos && resolutionData.photos.length > 0) {
          resolutionData.photos.forEach((photo, index) => {
            formData.append("resolutionPhotos", photo);
          });
        }
      }

      // Debug: Log all FormData entries
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      await updateStatusMutation.mutateAsync({
        id: complaintId,
        payload: formData,
      });

      toast.success(
        `Complaint ${
          newStatus === "in-progress" ? "started" : "completed"
        } successfully!`
      );

      if (newStatus === "resolved") {
        navigate(
          `/technician/billing?complaintId=${encodeURIComponent(complaintId)}`
        );
      }
    } catch (error) {
      console.error("âŒ Update status error:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const openPhotoModal = (photos, initialIndex) => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      toast.error("No photos available");
      return;
    }

    setCurrentComplaintPhotos(photos);
    setCurrentPhotoIndex(initialIndex);
    setSelectedPhoto(photos[initialIndex]);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setCurrentPhotoIndex(0);
    setCurrentComplaintPhotos([]);
  };

  const handlePhotoNavigation = (direction) => {
    if (!currentComplaintPhotos || currentComplaintPhotos.length === 0) return;

    const newIndex =
      direction === "next"
        ? (currentPhotoIndex + 1) % currentComplaintPhotos.length
        : (currentPhotoIndex - 1 + currentComplaintPhotos.length) %
          currentComplaintPhotos.length;

    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(currentComplaintPhotos[newIndex]);
  };

  const downloadPhoto = async (photoUrl, fileName) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "complaint-photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Photo downloaded successfully!");
    } catch (error) {
      console.error("Failed to download photo:", error);
      toast.error("Failed to download photo");
    }
  };

  const openResolutionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setShowResolutionModal(true);
    setResolutionData({ notes: "", materialsUsed: "", photos: [] });
  };

  const openStartWorkConfirm = (complaint) => {
    setPendingStartComplaint(complaint);
    setShowStartWorkConfirm(true);
  };

  const closeStartWorkConfirm = () => {
    if (isStartingWork) return;
    setShowStartWorkConfirm(false);
    setPendingStartComplaint(null);
  };

  const confirmStartWork = async () => {
    if (!pendingStartComplaint?._id) return;

    setIsStartingWork(true);
    try {
      await updateComplaintStatus(pendingStartComplaint._id, "in-progress");
      closeStartWorkConfirm();
    } finally {
      setIsStartingWork(false);
    }
  };

  const closeResolutionModal = () => {
    setShowResolutionModal(false);
    setSelectedComplaint(null);
    setResolutionData({ notes: "", materialsUsed: "", photos: [] });
  };

  const handleResolutionSubmit = async () => {
    if (!selectedComplaint) return;

    setIsSubmitting(true);
    try {
      await updateComplaintStatus(
        selectedComplaint._id,
        "resolved",
        "",
        resolutionData
      );
      closeResolutionModal();
    } catch (error) {
      console.error("Resolution submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + resolutionData.photos.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    setResolutionData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
    }));
  };

  const removePhoto = (index) => {
    setResolutionData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const buildWhatsAppShareUrl = (complaint) => {
    const technician = complaint.assignedTechnician?.name;
    const statusLabel = complaint.status.replace("-", " ").toUpperCase();
    const lines = [
      `*Complaint Update — CMS*`,
      ``,
      `*Issue:* ${complaint.title}`,
      `*Status:* ${statusLabel}`,
      technician ? `*Technician:* ${technician}` : null,
      complaint.resolutionNotes ? `*Resolution:* ${complaint.resolutionNotes}` : null,
      (complaint.resolvedAt || complaint.completedAt)
        ? `*Resolved on:* ${new Date(complaint.resolvedAt || complaint.completedAt).toLocaleString()}`
        : null,
      ``,
      `_Shared via Constro CMS_`,
    ];
    const message = lines.filter((l) => l !== null).join("\n");
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handleShareOnWhatsApp = (complaint) => {
    window.open(buildWhatsAppShareUrl(complaint), "_blank", "noopener,noreferrer");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "in-progress":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-orange-600";
      case "urgent":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Photo Modal */}
        {photoModalOpen &&
          selectedPhoto &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[100]"
              style={{
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={closePhotoModal}
            >
              <div
                className="relative w-full h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closePhotoModal}
                  className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/40 rounded-full p-2"
                >
                  <X className="h-6 w-6" />
                </button>

                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={selectedPhoto.url}
                    alt="Complaint photo"
                    className="w-full h-full object-contain"
                  />
                </div>

                {currentComplaintPhotos &&
                  currentComplaintPhotos.length > 1 && (
                    <>
                      <button
                        onClick={() => handlePhotoNavigation("prev")}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </button>
                      <button
                        onClick={() => handlePhotoNavigation("next")}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
                      >
                        <ChevronRight className="h-8 w-8" />
                      </button>
                    </>
                  )}

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/70 rounded-lg px-4 py-2">
                  <span className="text-white text-sm">
                    {currentPhotoIndex + 1} of{" "}
                    {currentComplaintPhotos?.length || 0}
                  </span>
                  <button
                    onClick={() =>
                      downloadPhoto(
                        selectedPhoto.url,
                        `complaint-photo-${currentPhotoIndex + 1}.jpg`
                      )
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </motion.div>,
            document.body
          )}

        {/* Header */}
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            My Assignments
          </h1>
          <p
            className={`mt-1 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            View and manage your active complaint assignments
          </p>
        </div>

        {/* Filters */}
        <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"}`}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm transition-all duration-200 ${
                    isDarkMode
                      ? "bg-white/10 border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full pl-4 pr-10 py-2 border rounded-lg appearance-none cursor-pointer text-sm transition-all duration-200 ${
                    isDarkMode
                      ? "bg-[#1a1a1a] border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`w-full pl-4 pr-10 py-2 border rounded-lg appearance-none cursor-pointer text-sm transition-all duration-200 ${
                    isDarkMode
                      ? "bg-[#1a1a1a] border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  }`}
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Store */}
            <div>
              <StoreDropdown
                isDarkMode={isDarkMode}
                options={["All Stores", ...storeOptions]}
                value={locationFilter === "all" ? "All Stores" : locationFilter}
                onChange={(picked) => setLocationFilter(picked === "All Stores" ? "all" : picked)}
                placeholder="All Stores"
                compact
                inputClassName="h-[38px] py-0 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Active Assignments List */}
        {assignments.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <ClipboardList
              className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 ${
                isDarkMode ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <p
              className={`text-lg sm:text-xl font-medium mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No active assignments
            </p>
            <p
              className={`text-sm sm:text-base ${
                isDarkMode ? "text-gray-500" : "text-gray-500"
              }`}
            >
              New assignments will appear here when they are assigned to you
            </p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className={`text-center py-10 rounded-2xl border ${isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"}`}>
            <p className={`text-base font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No assignments match your filters
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedAssignments.map((complaint) => (
              <motion.div
                key={complaint._id}
                className={`border rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg ${
                  isDarkMode
                    ? "bg-[#111] border-white/10"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <h3
                        className={`text-lg sm:text-xl font-bold truncate ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {complaint.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {complaint.status.replace("-", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold capitalize whitespace-nowrap ${getPriorityColor(
                            complaint.priority
                          )}`}
                        >
                          {complaint.priority} Priority
                        </span>
                      </div>
                    </div>

                    <p
                      className={`mb-4 text-sm sm:text-base line-clamp-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {complaint.description}
                    </p>

                    {/* Rest of complaint details with theme-aware colors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-4">
                      <div className="space-y-2">
                        <div
                          className={`flex items-center space-x-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            <strong>Creator:</strong>{" "}
                            {complaint.client?.name ||
                              complaint.createdByAdmin?.name ||
                              complaint.createdByTechnician?.name ||
                              "N/A"}
                            <span
                              className={`ml-1 text-xs px-1.5 py-0.5 rounded ${
                                isDarkMode
                                  ? "bg-white/10 text-gray-300"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {complaint.creatorType || "client"}
                            </span>
                          </span>
                        </div>
                        <div
                          className={`flex items-center space-x-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            <strong>Location:</strong> {complaint.location}
                          </span>
                        </div>
                        <div
                          className={`flex items-center space-x-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            <strong>Outlet Managers:</strong>{" "}
                            {complaint.store?.managers?.length
                              ? complaint.store.managers
                                  .map((m) => `${m.name} (${m.phoneNumber})`)
                                  .join(", ")
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div
                          className={`flex items-center space-x-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            <strong>Assigned:</strong>{" "}
                            {new Date(
                              complaint.assignedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`whitespace-nowrap ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <strong>ID:</strong> {complaint.complaintId}
                        </div>
                      </div>
                    </div>

                    {/* Photos section with theme colors */}
                    {complaint.photos &&
                      Array.isArray(complaint.photos) &&
                      complaint.photos.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p
                              className={`text-xs sm:text-sm font-semibold ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Photos ({complaint.photos.length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {complaint.photos
                              .slice(0, 4)
                              .map((photo, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={photo.url}
                                    alt={`Complaint photo ${index + 1}`}
                                    className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border ${
                                      isDarkMode
                                        ? "border-white/10"
                                        : "border-gray-300"
                                    }`}
                                    onClick={() =>
                                      openPhotoModal(complaint.photos, index)
                                    }
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPhotoModal(
                                            complaint.photos,
                                            index
                                          );
                                        }}
                                        className="p-1 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                        aria-label="View photo"
                                      >
                                        <Eye className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadPhoto(
                                            photo.url,
                                            `complaint-${
                                              complaint.complaintId
                                            }-photo-${index + 1}.jpg`
                                          );
                                        }}
                                        className="p-1 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                        aria-label="Download photo"
                                      >
                                        <Download className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {complaint.photos.length > 4 && (
                              <div
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                                  isDarkMode
                                    ? "border-white/10 text-gray-400 hover:bg-white/5"
                                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                                }`}
                              >
                                +{complaint.photos.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Action Buttons - keep existing styling as they already use proper colors */}
                  <div className="flex lg:flex-col gap-2 lg:ml-4 justify-end lg:justify-start">
                    {complaint.status === "assigned" && (
                      <motion.button
                        onClick={() => openStartWorkConfirm(complaint)}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Start Work</span>
                      </motion.button>
                    )}

                    {complaint.status === "in-progress" && (
                      <motion.button
                        onClick={() => openResolutionModal(complaint)}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Complete</span>
                      </motion.button>
                    )}

                    <motion.button
                      onClick={() => handleShareOnWhatsApp(complaint)}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Share</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredAssignments.length > itemsPerPage && (
          <div className="flex items-center justify-between pt-2">
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${isDarkMode ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${isDarkMode ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Resolution Modal */}
        {showResolutionModal && selectedComplaint && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]"
            style={{
              margin: 0,
              padding: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <div
              className={`w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-4 my-4 rounded-2xl shadow-2xl ${
                isDarkMode ? "bg-[#111] dark-scrollbar" : "bg-white"
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3
                    className={`text-xl font-semibold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Mark Complaint as Resolved
                  </h3>
                  <button
                    onClick={closeResolutionModal}
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4
                      className={`font-medium mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedComplaint.title}
                    </h4>
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      ID: {selectedComplaint.complaintId}
                    </p>
                  </div>

                  {/* Resolution Notes */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Resolution Notes *
                    </label>
                    <textarea
                      value={resolutionData.notes}
                      onChange={(e) =>
                        setResolutionData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Describe how the complaint was resolved..."
                      className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                        isDarkMode
                          ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      }`}
                      required
                    />
                  </div>

                  {/* Materials Used Input */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Materials Used *
                    </label>
                    <textarea
                      value={resolutionData.materialsUsed}
                      onChange={(e) =>
                        setResolutionData((prev) => ({
                          ...prev,
                          materialsUsed: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="List all materials used to resolve this complaint (e.g., LED bulbs, wires, switches, etc.)"
                      className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 resize-none ${
                        isDarkMode
                          ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      }`}
                    />
                  </div>

                  {/* Resolution Photos */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Resolution Proof Photos (Optional)
                    </label>

                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center ${
                        isDarkMode
                          ? "border-white/10 hover:border-gray-500"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="resolution-photos"
                      />
                      <label
                        htmlFor="resolution-photos"
                        className="cursor-pointer"
                      >
                        <Camera
                          className={`h-8 w-8 mx-auto mb-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        />
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          Click to add photos showing the resolved work
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isDarkMode ? "text-gray-500" : "text-gray-500"
                          }`}
                        >
                          Maximum 5 photos, up to 10MB each
                        </p>
                      </label>
                    </div>

                    {/* Photo Preview */}
                    {resolutionData.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {resolutionData.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Resolution proof ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={closeResolutionModal}
                      className={`flex-1 py-3 px-4 border rounded-xl font-semibold transition-all duration-200 ${
                        isDarkMode
                          ? "border-white/10 text-gray-300 hover:bg-white/10"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleResolutionSubmit}
                      disabled={
                        !resolutionData.notes.trim() ||
                        !resolutionData.materialsUsed.trim() ||
                        isSubmitting
                      }
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckSquare className="h-5 w-5" />
                          <span>Mark as Resolved</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Work Confirmation Modal */}
        {showStartWorkConfirm && pendingStartComplaint && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]"
            style={{
              margin: 0,
              padding: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={closeStartWorkConfirm}
          >
            <div
              className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl ${
                isDarkMode ? "bg-[#111]" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Start work?
                  </h3>
                  <button
                    onClick={closeStartWorkConfirm}
                    disabled={isStartingWork}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:bg-white/10"
                        : "text-gray-600 hover:bg-gray-100"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p
                  className={`${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  This will mark the complaint as <strong>In Progress</strong>.
                </p>
                <p
                  className={`mt-2 text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {pendingStartComplaint.title} (ID:{" "}
                  {pendingStartComplaint.complaintId})
                </p>

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={closeStartWorkConfirm}
                    disabled={isStartingWork}
                    className={`flex-1 py-3 px-4 border rounded-xl font-semibold transition-all duration-200 ${
                      isDarkMode
                        ? "border-white/10 text-gray-300 hover:bg-white/10"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmStartWork}
                    disabled={isStartingWork}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isStartingWork ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        <span>Start</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TechnicianAssignments;

