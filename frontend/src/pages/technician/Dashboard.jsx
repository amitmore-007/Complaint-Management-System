import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  Play,
  CheckSquare,
  FileText,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuthStore from "../../store/authStore";
import {
  useTechnicianDashboardAssignments,
  useUpdateComplaintStatus,
} from "../../hooks/useComplaints";
import { useResolvedComplaints } from "../../hooks/useComplaints";
import { useTechnicianBillingRecords } from "../../hooks/useBilling";

const TechnicianDashboard = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const assignmentsQuery = useTechnicianDashboardAssignments();
  const updateStatusMutation = useUpdateComplaintStatus();
  const billingQuery = useTechnicianBillingRecords({ page: 1, limit: 200 });
  const resolvedQuery = useResolvedComplaints();

  const billedComplaintIds = useMemo(() => {
    const records = billingQuery.data?.records ?? [];
    const ids = records
      .map((r) => r?.complaint?._id ?? r?.complaint)
      .filter(Boolean)
      .map(String);
    return new Set(ids);
  }, [billingQuery.data]);

  const isBillingPending = (complaint) => {
    if (complaint?.status !== "resolved") return false;
    if (!complaint?._id) return false;
    return !billedComplaintIds.has(String(complaint._id));
  };

  const resolvedComplaints = useMemo(() => {
    return Array.isArray(resolvedQuery.data) ? resolvedQuery.data : [];
  }, [resolvedQuery.data]);

  const pendingBillingComplaints = useMemo(() => {
    if (billingQuery.isLoading || resolvedQuery.isLoading) return [];
    return resolvedComplaints.filter(isBillingPending);
  }, [
    billingQuery.isLoading,
    resolvedQuery.isLoading,
    resolvedComplaints,
    billedComplaintIds,
  ]);

  const assignments = useMemo(() => {
    const payload = assignmentsQuery.data;
    return Array.isArray(payload?.complaints) ? payload.complaints : [];
  }, [assignmentsQuery.data]);

  const stats = assignmentsQuery.data?.stats || {
    total: assignments.length,
    assigned: assignments.filter((c) => c.status === "assigned").length,
    inProgress: assignments.filter((c) => c.status === "in-progress").length,
    completed: assignments.filter((c) => c.status === "resolved").length,
  };

  const isLoading = assignmentsQuery.isLoading;
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

      // Validate required fields for resolved status
      if (
        newStatus === "resolved" &&
        (!resolutionData ||
          !resolutionData.notes?.trim() ||
          !resolutionData.materialsUsed?.trim())
      ) {
        toast.error(
          "Resolution notes and materials used are required when completing a complaint"
        );
        return;
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

      await assignmentsQuery.refetch();

      // After completing a complaint, take technician directly to billing
      if (newStatus === "resolved") {
        navigate(
          `/technician/billing?complaintId=${encodeURIComponent(complaintId)}`
        );
      }
    } catch (error) {
      console.error("❌ Update status error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update status";
      toast.error(errorMessage);
    }
  };

  const openPhotoModal = (photos, index) => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      toast.error("No photos available");
      return;
    }

    setCurrentComplaintPhotos(photos);
    setCurrentPhotoIndex(index);
    setSelectedPhoto(photos[index]);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setCurrentComplaintPhotos([]);
    setCurrentPhotoIndex(0);
  };

  const navigatePhoto = (direction) => {
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

  const downloadAllPhotos = async (photos, complaintId) => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      toast.error("No photos to download");
      return;
    }

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileName = `complaint-${complaintId}-photo-${i + 1}.jpg`;
        await downloadPhoto(photo.url, fileName);
        // Add small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Failed to download photos:", error);
      toast.error("Failed to download all photos");
    }
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

  const openResolutionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setShowResolutionModal(true);
    setResolutionData({ notes: "", materialsUsed: "", photos: [] });
  };

  const closeResolutionModal = () => {
    setShowResolutionModal(false);
    setSelectedComplaint(null);
    setResolutionData({ notes: "", materialsUsed: "", photos: [] });
  };

  const handleResolutionSubmit = async () => {
    if (!selectedComplaint) return;

    // Validate resolution notes
    if (!resolutionData.notes.trim()) {
      toast.error("Resolution notes are required");
      return;
    }

    if (!resolutionData.materialsUsed?.trim()) {
      toast.error("Materials used is required");
      return;
    }

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

  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "in-progress":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      case "resolved":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
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

  const statsCards = [
    {
      title: "Total Assignments",
      value: stats.total,
      icon: ClipboardList,
      color: "primary",
      bgColor: "from-blue-600 to-blue-700",
    },
    {
      title: "Assigned",
      value: stats.assigned,
      icon: Clock,
      color: "blue",
      bgColor: "from-cyan-500 to-cyan-600",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: AlertCircle,
      color: "orange",
      bgColor: "from-orange-500 to-orange-600",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      color: "green",
      bgColor: "from-emerald-500 to-emerald-600",
    },
  ];

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
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1
            className={`text-3xl sm:text-4xl font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Welcome back, {user?.name}!
          </h1>
          <p
            className={`text-base sm:text-lg ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Here are your current assignments and tasks.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`group relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl overflow-hidden ${
                isDarkMode
                  ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-blue-500/10"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg"
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  isDarkMode ? "" : "hidden"
                }`}
              ></div>

              <div className="relative flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs sm:text-sm font-medium mb-1 truncate ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {card.title}
                  </p>
                  <p
                    className={`text-2xl sm:text-3xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r ${card.bgColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ml-3`}
                >
                  <card.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
              </div>

              {/* Shine effect - only show in dark mode */}
              {isDarkMode && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              )}
            </motion.div>
          ))}
        </div>

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
                        onClick={() => navigatePhoto("prev")}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </button>
                      <button
                        onClick={() => navigatePhoto("next")}
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
                isDarkMode ? "bg-gray-800" : "bg-white"
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
                        ? "text-gray-400 hover:bg-gray-700"
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
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmStartWork}
                    disabled={isStartingWork}
                    className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

        {/* Active Assignments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`border rounded-2xl p-4 sm:p-6 shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <h2
            className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Active Assignments
          </h2>

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
                No assignments yet
              </p>
              <p
                className={`text-sm sm:text-base ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                New assignments will appear here when they are assigned to you
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className={`group border rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg ${
                    isDarkMode
                      ? "bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-blue-500/5"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md"
                  }`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="text-lg sm:text-xl font-bold text-white truncate">
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

                      <p className="text-gray-300 mb-4 text-sm sm:text-base line-clamp-2">
                        {complaint.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">
                              <strong>Creator:</strong>{" "}
                              {complaint.client?.name ||
                                complaint.createdByAdmin?.name ||
                                complaint.createdByTechnician?.name ||
                                "N/A"}
                              <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                {complaint.creatorType || "client"}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">
                              <strong>Location:</strong> {complaint.location}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
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
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              <strong>Assigned:</strong>{" "}
                              {new Date(
                                complaint.assignedAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-gray-400 whitespace-nowrap">
                            <strong>ID:</strong> {complaint.complaintId}
                          </div>
                        </div>
                      </div>

                      {/* Photos */}
                      {complaint.photos &&
                        Array.isArray(complaint.photos) &&
                        complaint.photos.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs sm:text-sm font-semibold text-gray-300">
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
                                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-gray-600"
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
                                        >
                                          <Download className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              {complaint.photos.length > 4 && (
                                <div
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-xs font-medium text-gray-400 cursor-pointer hover:bg-gray-700/50 transition-all"
                                  onClick={() =>
                                    openPhotoModal(complaint.photos, 4)
                                  }
                                >
                                  +{complaint.photos.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Technician Notes */}
                      {complaint.technicianNotes && (
                        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                          <p className="text-xs sm:text-sm text-blue-300">
                            <strong>Notes:</strong> {complaint.technicianNotes}
                          </p>
                        </div>
                      )}

                      {/* Resolution Data - Show for resolved complaints */}
                      {complaint.status === "resolved" &&
                        (complaint.resolutionNotes ||
                          (complaint.resolutionPhotos &&
                            complaint.resolutionPhotos.length > 0)) && (
                          <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              <span className="text-xs sm:text-sm font-semibold text-green-300">
                                Resolution Details
                              </span>
                            </div>

                            {complaint.resolutionNotes && (
                              <p className="text-xs sm:text-sm text-green-200 mb-2">
                                <strong>Resolution:</strong>{" "}
                                {complaint.resolutionNotes}
                              </p>
                            )}

                            {complaint.resolvedAt && (
                              <p className="text-xs text-green-300">
                                <strong>Completed:</strong>{" "}
                                {new Date(
                                  complaint.resolvedAt
                                ).toLocaleString()}
                              </p>
                            )}

                            {complaint.resolutionPhotos &&
                              complaint.resolutionPhotos.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-green-300 mb-2">
                                    Resolution Photos:{" "}
                                    {complaint.resolutionPhotos.length}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {complaint.resolutionPhotos
                                      .slice(0, 3)
                                      .map((photo, index) => (
                                        <img
                                          key={index}
                                          src={photo.url}
                                          alt={`Resolution photo ${index + 1}`}
                                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-green-600 cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => {
                                            // Create combined photos array for modal
                                            const allPhotos = [
                                              ...(complaint.photos || []),
                                              ...complaint.resolutionPhotos,
                                            ];
                                            const resolutionPhotoIndex =
                                              (complaint.photos?.length || 0) +
                                              index;
                                            openPhotoModal(
                                              allPhotos,
                                              resolutionPhotoIndex
                                            );
                                          }}
                                        />
                                      ))}
                                    {complaint.resolutionPhotos.length > 3 && (
                                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border-2 border-dashed border-green-600 flex items-center justify-center text-xs font-medium text-green-400">
                                        +{complaint.resolutionPhotos.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex lg:flex-col gap-2 lg:ml-4 justify-end lg:justify-start">
                      {complaint.status === "assigned" && (
                        <motion.button
                          onClick={() => openStartWorkConfirm(complaint)}
                          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
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
                          className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Complete</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Billing Pending Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={`border rounded-2xl p-4 sm:p-6 shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2
              className={`text-xl sm:text-2xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Billing Pending
            </h2>
            <button
              onClick={() => navigate("/technician/resolved-assignments")}
              className={`text-sm font-semibold underline-offset-4 hover:underline ${
                isDarkMode ? "text-blue-300" : "text-blue-600"
              }`}
            >
              View all resolved
            </button>
          </div>

          {billingQuery.isLoading || resolvedQuery.isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : pendingBillingComplaints.length === 0 ? (
            <div
              className={`p-6 rounded-2xl border text-center ${
                isDarkMode
                  ? "bg-gray-900 border-gray-800 text-gray-300"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              <FileText className="h-9 w-9 mx-auto mb-2 opacity-70" />
              No pending billing submissions for resolved complaints.
            </div>
          ) : (
            <div className="space-y-3">
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                Material/billing records are missing for{" "}
                {pendingBillingComplaints.length} resolved complaint(s).
              </p>

              <div className="space-y-3">
                {pendingBillingComplaints.slice(0, 5).map((c) => (
                  <div
                    key={c._id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border ${
                      isDarkMode
                        ? "bg-gray-900 border-gray-800"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {c.title}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            isDarkMode
                              ? "bg-yellow-900/30 text-yellow-200 border border-yellow-700/50"
                              : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          }`}
                        >
                          BILLING PENDING
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            isDarkMode
                              ? "bg-gray-800 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.complaintId}
                        </span>
                      </div>
                      <div
                        className={`text-xs sm:text-sm mt-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Location: {c.location}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          navigate(
                            `/technician/billing?complaintId=${encodeURIComponent(
                              c._id
                            )}`
                          )
                        }
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Submit Billing</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pendingBillingComplaints.length > 5 && (
                <div
                  className={`${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  } text-sm`}
                >
                  Showing 5 of {pendingBillingComplaints.length}. Use “View all
                  resolved” to see everything.
                </div>
              )}
            </div>
          )}
        </motion.div>

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
                isDarkMode ? "bg-gray-800" : "bg-white"
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
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
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
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      }`}
                      required
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
                          ? "border-gray-600 hover:border-gray-500"
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
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleResolutionSubmit}
                      disabled={
                        !resolutionData?.notes?.trim() ||
                        !resolutionData?.materialsUsed?.trim() ||
                        isSubmitting
                      }
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
      </div>
    </DashboardLayout>
  );
};

export default TechnicianDashboard;
