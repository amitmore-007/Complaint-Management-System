import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Users,
  Wrench,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Calendar,
  MapPin,
  Eye,
  UserCheck,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuthStore from "../../store/authStore";
import { toast } from "react-toastify";
import { useAdminDashboardStats } from "../../hooks/useAdmin";
import api from "../../lib/axios";

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();

  const dashboardStatsQuery = useAdminDashboardStats();
  const stats = dashboardStatsQuery.data || {
    totalComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
    totalClients: 0,
    totalTechnicians: 0,
    activeTechnicians: 0,
    recentComplaints: [],
  };
  const isLoading = dashboardStatsQuery.isLoading;
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);
  const [formData, setFormData] = useState({ name: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const openDetailsModal = async (complaint) => {
    try {
      const response = await api.get(`/admin/complaints/${complaint._id}`);
      setSelectedComplaint(response.data.complaint);
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Failed to fetch complaint details:", error);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedComplaint(null);
  };

  const openPhotoModal = (photos, index) => {
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
    } catch (error) {
      console.error("Failed to download photo:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
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
      title: "Total Complaints",
      value: stats.totalComplaints,
      icon: FileText,
      color: "primary",
      bgColor: "from-blue-600 to-blue-700",
      link: "/admin/complaints",
    },
    {
      title: "Pending",
      value: stats.pendingComplaints,
      icon: Clock,
      color: "yellow",
      bgColor: "from-amber-500 to-amber-600",
      link: "/admin/complaints?status=pending",
    },
    {
      title: "In Progress",
      value: stats.inProgressComplaints,
      icon: AlertCircle,
      color: "orange",
      bgColor: "from-orange-500 to-orange-600",
      link: "/admin/complaints?status=in-progress",
    },
    {
      title: "Resolved",
      value: stats.resolvedComplaints,
      icon: CheckCircle,
      color: "green",
      bgColor: "from-emerald-500 to-emerald-600",
      link: "/admin/complaints?status=resolved",
    },
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Users,
      color: "blue",
      bgColor: "from-cyan-500 to-cyan-600",
      link: "/admin/clients",
    },
    {
      title: "Active Technicians",
      value: `${stats.activeTechnicians}/${stats.totalTechnicians}`,
      icon: Wrench,
      color: "purple",
      bgColor: "from-purple-500 to-purple-600",
      link: "/admin/technicians",
    },
  ];

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/equipment/create", formData);
      toast.success("Equipment added successfully");
      setShowAddModal(false);
      setFormData({ name: "" });
      fetchEquipment();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add equipment");
    }
  };

  const handleEditEquipment = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/equipment/${selectedEquipment._id}`, formData);
      toast.success("Equipment updated successfully");
      setShowEditModal(false);
      setSelectedEquipment(null);
      setFormData({ name: "" });
      fetchEquipment();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update equipment"
      );
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
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1
            className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Admin Dashboard
          </h1>
          <p
            className={`text-sm sm:text-base md:text-lg ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Welcome back, {user?.name}! Here's your system overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={card.link}>
                <div
                  className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl overflow-hidden ${
                    isDarkMode
                      ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-blue-500/10"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg"
                  }`}
                >
                  {/* Background gradient overlay - only show in dark mode */}
                  {isDarkMode && (
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  )}

                  <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium mb-1 ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {card.title}
                      </p>
                      <p
                        className={`text-3xl font-bold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={`w-14 h-14 bg-gradient-to-r ${card.bgColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <card.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>

                  {/* Shine effect - only show in dark mode */}
                  {isDarkMode && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Recent Complaints */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`border rounded-2xl p-6 shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2
              className={`text-xl sm:text-2xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Recent Complaints
            </h2>
            <Link
              to="/admin/complaints"
              className={`text-sm sm:text-base font-medium transition-colors ${
                isDarkMode
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              View All
            </Link>
          </div>

          {stats.recentComplaints.length === 0 ? (
            <div className="text-center py-16">
              <FileText
                className={`h-16 w-16 mx-auto mb-4 ${
                  isDarkMode ? "text-gray-600" : "text-gray-400"
                }`}
              />
              <p
                className={`text-xl font-medium mb-2 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No complaints yet
              </p>
              <p className={isDarkMode ? "text-gray-500" : "text-gray-500"}>
                Complaints will appear here as they are submitted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentComplaints.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className={`group border rounded-xl p-5 transition-all duration-300 hover:shadow-lg ${
                    isDarkMode
                      ? "bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-blue-500/5"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md"
                  }`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2 sm:space-x-3 mb-3">
                        <h3
                          className={`font-bold text-base sm:text-lg ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {complaint.title}
                        </h3>
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {complaint.status.replace("-", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold capitalize ${getPriorityColor(
                            complaint.priority
                          )}`}
                        >
                          {complaint.priority}
                        </span>
                      </div>

                      <p
                        className={`mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        {complaint.description}
                      </p>

                      <div
                        className={`flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        <span className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>
                            {complaint.client?.name ||
                              complaint.createdByAdmin?.name ||
                              complaint.createdByTechnician?.name ||
                              "N/A"}
                            <span
                              className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                isDarkMode
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {complaint.creatorType || "client"}
                            </span>
                          </span>
                        </span>
                        <span className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{complaint.location}</span>
                        </span>
                        <span className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                        <span
                          className={
                            isDarkMode ? "text-gray-500" : "text-gray-500"
                          }
                        >
                          ID: {complaint.complaintId}
                        </span>
                      </div>

                      {complaint.assignedTechnician && (
                        <div className="mt-3 flex items-center space-x-2 text-sm">
                          <UserCheck className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400">
                            Assigned to: {complaint.assignedTechnician.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openDetailsModal(complaint)}
                      className="sm:ml-4 w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Photo Modal */}
        <AnimatePresence>
          {photoModalOpen && selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
              style={{ margin: 0, padding: 0 }}
              onClick={closePhotoModal}
            >
              <div
                className="relative max-w-6xl max-h-[95vh] p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closePhotoModal}
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
                >
                  <X className="h-8 w-8" />
                </button>

                <img
                  src={selectedPhoto.url}
                  alt="Complaint photo"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />

                {currentComplaintPhotos.length > 1 && (
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
                    {currentPhotoIndex + 1} of {currentComplaintPhotos.length}
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details Modal */}
        <AnimatePresence>
          {showDetailsModal && selectedComplaint && (
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
              onClick={closeDetailsModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-4xl max-h-[95vh] mx-4 my-4 overflow-hidden border rounded-2xl shadow-2xl ${
                  isDarkMode
                    ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  className={`sticky top-0 p-6 border-b backdrop-blur-sm ${
                    isDarkMode
                      ? "border-gray-700 bg-gray-900/90"
                      : "border-gray-200 bg-white/90"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2
                        className={`text-2xl font-bold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {selectedComplaint.title}
                      </h2>
                      <p
                        className={
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }
                      >
                        ID: {selectedComplaint.complaintId}
                      </p>
                    </div>
                    <button
                      onClick={closeDetailsModal}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode
                          ? "hover:bg-gray-800 text-gray-400"
                          : "hover:bg-gray-100 text-gray-500"
                      }`}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Content - Make it scrollable */}
                <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
                  <div className="p-6 space-y-6">
                    {/* Status and Priority */}
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(
                          selectedComplaint.status
                        )}`}
                      >
                        {selectedComplaint.status
                          .replace("-", " ")
                          .toUpperCase()}
                      </span>
                      <span
                        className={`text-sm font-semibold capitalize ${getPriorityColor(
                          selectedComplaint.priority
                        )}`}
                      >
                        {selectedComplaint.priority} Priority
                      </span>
                    </div>

                    {/* Description */}
                    <div
                      className={`border rounded-xl p-4 ${
                        isDarkMode
                          ? "bg-gray-800/50 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <h3
                        className={`text-lg font-semibold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Description
                      </h3>
                      <p
                        className={`leading-relaxed ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {selectedComplaint.description}
                      </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`border rounded-xl p-4 ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <h4
                          className={`font-semibold mb-3 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Creator Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <Users
                              className={`h-4 w-4 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            />
                            <span>
                              {selectedComplaint.client?.name ||
                                selectedComplaint.createdByAdmin?.name ||
                                selectedComplaint.createdByTechnician?.name ||
                                "N/A"}
                              <span
                                className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  isDarkMode
                                    ? "bg-gray-700 text-gray-300"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {selectedComplaint.creatorType || "client"}
                              </span>
                            </span>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <Phone
                              className={`h-4 w-4 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            />
                            <span>
                              {selectedComplaint.client?.phoneNumber ||
                                selectedComplaint.createdByAdmin?.phoneNumber ||
                                selectedComplaint.createdByTechnician
                                  ?.phoneNumber ||
                                "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border rounded-xl p-4 ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <h4
                          className={`font-semibold mb-3 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Complaint Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <MapPin
                              className={`h-4 w-4 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            />
                            <span>{selectedComplaint.location}</span>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            <Calendar
                              className={`h-4 w-4 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            />
                            <span>
                              {new Date(
                                selectedComplaint.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technician Info */}
                    {selectedComplaint.assignedTechnician && (
                      <div
                        className={`border rounded-xl p-4 ${
                          isDarkMode
                            ? "bg-blue-900/20 border-blue-700/50"
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <h4
                          className={`font-semibold mb-3 ${
                            isDarkMode ? "text-blue-300" : "text-blue-700"
                          }`}
                        >
                          Assigned Technician
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p
                            className={
                              isDarkMode ? "text-blue-200" : "text-blue-700"
                            }
                          >
                            <strong>Name:</strong>{" "}
                            {selectedComplaint.assignedTechnician.name}
                          </p>
                          <p
                            className={
                              isDarkMode ? "text-blue-200" : "text-blue-700"
                            }
                          >
                            <strong>Phone:</strong>{" "}
                            {selectedComplaint.assignedTechnician.phoneNumber}
                          </p>
                          {selectedComplaint.assignedAt && (
                            <p
                              className={
                                isDarkMode ? "text-blue-200" : "text-blue-700"
                              }
                            >
                              <strong>Assigned:</strong>{" "}
                              {new Date(
                                selectedComplaint.assignedAt
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div
                      className={`border rounded-xl p-4 ${
                        isDarkMode
                          ? "bg-gray-800/50 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <h4
                        className={`font-semibold mb-4 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Timeline
                      </h4>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p
                              className={`font-medium ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Complaint Created
                            </p>
                            <p
                              className={`${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {new Date(
                                selectedComplaint.createdAt
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {selectedComplaint.assignedAt && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                Assigned
                              </p>
                              <p
                                className={`${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {new Date(
                                  selectedComplaint.assignedAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedComplaint.startedAt && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                Work Started
                              </p>
                              <p
                                className={`${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {new Date(
                                  selectedComplaint.startedAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {(selectedComplaint.completedAt ||
                          selectedComplaint.resolvedAt) && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p
                                className={`font-medium ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                Completed
                              </p>
                              <p
                                className={`${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {new Date(
                                  selectedComplaint.completedAt ||
                                    selectedComplaint.resolvedAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photos */}
                    {selectedComplaint.photos &&
                      selectedComplaint.photos.length > 0 && (
                        <div
                          className={`border rounded-xl p-4 ${
                            isDarkMode
                              ? "bg-gray-800/50 border-gray-700"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <h4
                            className={`font-semibold mb-4 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Photos ({selectedComplaint.photos.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {selectedComplaint.photos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photo.url}
                                  alt={`Complaint photo ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() =>
                                    openPhotoModal(
                                      selectedComplaint.photos,
                                      index
                                    )
                                  }
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPhotoModal(
                                          selectedComplaint.photos,
                                          index
                                        );
                                      }}
                                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                    >
                                      <Eye className="h-4 w-4 text-white" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadPhoto(
                                          photo.url,
                                          `complaint-${
                                            selectedComplaint.complaintId
                                          }-photo-${index + 1}.jpg`
                                        );
                                      }}
                                      className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                    >
                                      <Download className="h-4 w-4 text-white" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Technician Notes */}
                    {selectedComplaint.technicianNotes && (
                      <div
                        className={`border rounded-xl p-4 ${
                          isDarkMode
                            ? "bg-gray-800/50 border-gray-700"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <h4
                          className={`font-semibold mb-2 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Technician Notes
                        </h4>
                        <p
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          {selectedComplaint.technicianNotes}
                        </p>
                      </div>
                    )}

                    {/* Resolution Data - Only show for resolved complaints */}
                    {selectedComplaint.status === "resolved" &&
                      (selectedComplaint.resolutionNotes ||
                        (selectedComplaint.resolutionPhotos &&
                          selectedComplaint.resolutionPhotos.length > 0)) && (
                        <div
                          className={`border rounded-xl p-4 ${
                            isDarkMode
                              ? "bg-green-900/20 border-green-700/50"
                              : "bg-green-50 border-green-200"
                          }`}
                        >
                          <h4
                            className={`font-semibold mb-4 flex items-center space-x-2 ${
                              isDarkMode ? "text-green-300" : "text-green-700"
                            }`}
                          >
                            <CheckCircle className="h-5 w-5" />
                            <span>Resolution Details</span>
                          </h4>

                          {selectedComplaint.resolutionNotes && (
                            <div className="mb-4">
                              <h5
                                className={`font-medium mb-2 ${
                                  isDarkMode
                                    ? "text-green-200"
                                    : "text-green-800"
                                }`}
                              >
                                Resolution Notes
                              </h5>
                              <p
                                className={`leading-relaxed ${
                                  isDarkMode
                                    ? "text-green-100"
                                    : "text-green-700"
                                }`}
                              >
                                {selectedComplaint.resolutionNotes}
                              </p>
                            </div>
                          )}

                          {selectedComplaint.resolvedAt && (
                            <div className="mb-4">
                              <p
                                className={`text-sm ${
                                  isDarkMode
                                    ? "text-green-300"
                                    : "text-green-600"
                                }`}
                              >
                                <strong>Completed on:</strong>{" "}
                                {new Date(
                                  selectedComplaint.resolvedAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {selectedComplaint.resolutionPhotos &&
                            selectedComplaint.resolutionPhotos.length > 0 && (
                              <div>
                                <h5
                                  className={`font-medium mb-3 ${
                                    isDarkMode
                                      ? "text-green-200"
                                      : "text-green-800"
                                  }`}
                                >
                                  Resolution Proof Photos (
                                  {selectedComplaint.resolutionPhotos.length})
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {selectedComplaint.resolutionPhotos.map(
                                    (photo, index) => (
                                      <div
                                        key={index}
                                        className="relative group"
                                      >
                                        <img
                                          src={photo.url}
                                          alt={`Resolution photo ${index + 1}`}
                                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-green-300 dark:border-green-600"
                                          onClick={() => {
                                            // Create combined photos array for modal
                                            const allPhotos = [
                                              ...(selectedComplaint.photos ||
                                                []),
                                              ...selectedComplaint.resolutionPhotos,
                                            ];
                                            const resolutionPhotoIndex =
                                              (selectedComplaint.photos
                                                ?.length || 0) + index;
                                            openPhotoModal(
                                              allPhotos,
                                              resolutionPhotoIndex
                                            );
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const allPhotos = [
                                                  ...(selectedComplaint.photos ||
                                                    []),
                                                  ...selectedComplaint.resolutionPhotos,
                                                ];
                                                const resolutionPhotoIndex =
                                                  (selectedComplaint.photos
                                                    ?.length || 0) + index;
                                                openPhotoModal(
                                                  allPhotos,
                                                  resolutionPhotoIndex
                                                );
                                              }}
                                              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                            >
                                              <Eye className="h-4 w-4 text-white" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                downloadPhoto(
                                                  photo.url,
                                                  photo.originalName ||
                                                    `resolution-photo-${
                                                      index + 1
                                                    }.jpg`
                                                );
                                              }}
                                              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                            >
                                              <Download className="h-4 w-4 text-white" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`p-6 rounded-2xl shadow-lg border ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <h2
            className={`text-xl font-semibold mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/complaints?status=pending"
              className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center ${
                isDarkMode
                  ? "border-yellow-600 hover:bg-yellow-900/20"
                  : "border-yellow-300 hover:bg-yellow-50"
              }`}
            >
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p
                className={`font-medium ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-700"
                }`}
              >
                Review Pending Complaints
              </p>
              <p
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {stats.pendingComplaints} waiting for assignment
              </p>
            </Link>

            <Link
              to="/admin/technicians"
              className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center ${
                isDarkMode
                  ? "border-purple-600 hover:bg-purple-900/20"
                  : "border-purple-300 hover:bg-purple-50"
              }`}
            >
              <Wrench className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p
                className={`font-medium ${
                  isDarkMode ? "text-purple-400" : "text-purple-700"
                }`}
              >
                Manage Technicians
              </p>
              <p
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {stats.activeTechnicians} active technicians
              </p>
            </Link>

            <Link
              to="/admin/clients"
              className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center ${
                isDarkMode
                  ? "border-blue-600 hover:bg-blue-900/20"
                  : "border-blue-300 hover:bg-blue-50"
              }`}
            >
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p
                className={`font-medium ${
                  isDarkMode ? "text-blue-400" : "text-blue-700"
                }`}
              >
                Manage Clients
              </p>
              <p
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {stats.totalClients} registered clients
              </p>
            </Link>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
