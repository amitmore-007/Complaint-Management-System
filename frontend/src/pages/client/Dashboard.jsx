import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  MapPin,
  User,
  X,
  Download,
  PlayCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuthStore from "../../store/authStore";
import api from "../../lib/axios";

const ClientDashboard = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch all complaints for stats calculation
      const allComplaintsResponse = await api.get("/client/complaints");
      const allComplaints = allComplaintsResponse.data.complaints;

      // Fetch recent complaints (limited for display)
      const recentComplaintsResponse = await api.get(
        "/client/complaints?limit=5"
      );
      const recentComplaints = recentComplaintsResponse.data.complaints;

      setRecentComplaints(recentComplaints);

      // Calculate stats based on ALL complaints, not just recent ones
      const statsData = {
        total: allComplaints.length,
        pending: allComplaints.filter((c) => c.status === "pending").length,
        inProgress: allComplaints.filter((c) => c.status === "in-progress")
          .length,
        resolved: allComplaints.filter((c) => c.status === "resolved").length,
      };
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
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
      value: stats.total,
      icon: FileText,
      color: "primary",
      bgColor: "from-primary-500 to-primary-600",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "yellow",
      bgColor: "from-yellow-500 to-yellow-600",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: AlertCircle,
      color: "orange",
      bgColor: "from-orange-500 to-orange-600",
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle,
      color: "green",
      bgColor: "from-green-500 to-green-600",
    },
  ];

  const downloadImage = (imageUrl, fileName) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = fileName || "complaint-image.jpg";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ComplaintDetailModal = ({ complaint, onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      style={{ margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-4xl max-h-[95vh] overflow-y-auto mx-4 my-4 rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`sticky top-0 p-6 border-b ${
            isDarkMode
              ? "border-gray-700 bg-gray-800"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h2
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {complaint.title}
              </h2>
              <p
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                ID: {complaint.complaintId}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <X
                className={`h-6 w-6 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <span
              className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(
                complaint.status
              )}`}
            >
              {complaint.status.replace("-", " ").toUpperCase()}
            </span>
            <span
              className={`text-sm font-medium capitalize ${getPriorityColor(
                complaint.priority
              )}`}
            >
              {complaint.priority} Priority
            </span>
          </div>

          {/* Description */}
          <div>
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
              {complaint.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg ${
                isDarkMode ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <MapPin
                  className={`h-5 w-5 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                />
                <span
                  className={`font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Location
                </span>
              </div>
              <p className={isDarkMode ? "text-white" : "text-gray-900"}>
                {complaint.location}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                isDarkMode ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Calendar
                  className={`h-5 w-5 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                />
                <span
                  className={`font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Created Date
                </span>
              </div>
              <p className={isDarkMode ? "text-white" : "text-gray-900"}>
                {new Date(complaint.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Technician Info */}
          {complaint.assignedTechnician && (
            <div
              className={`p-4 rounded-lg border ${
                isDarkMode
                  ? "bg-blue-900/20 border-blue-700"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <User
                  className={`h-5 w-5 ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                />
                <span
                  className={`font-medium ${
                    isDarkMode ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  Assigned Technician
                </span>
              </div>
              <p className={isDarkMode ? "text-white" : "text-gray-900"}>
                {complaint.assignedTechnician.name}
              </p>
              {complaint.assignedAt && (
                <p
                  className={`text-sm mt-1 ${
                    isDarkMode ? "text-blue-300" : "text-blue-600"
                  }`}
                >
                  Assigned on: {new Date(complaint.assignedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Photos */}
          {complaint.photos && complaint.photos.length > 0 && (
            <div>
              <h3
                className={`text-lg font-semibold mb-4 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Photos ({complaint.photos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {complaint.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.url}
                      alt={`Complaint photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(photo)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(photo.url, photo.originalName);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technician Notes */}
          {complaint.technicianNotes && (
            <div
              className={`p-4 rounded-lg ${
                isDarkMode ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Technician Notes
              </h3>
              <p className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                {complaint.technicianNotes}
              </p>
            </div>
          )}

          {/* Resolution Data - Only show for resolved complaints */}
          {complaint.status === "resolved" &&
            (complaint.resolutionNotes ||
              (complaint.resolutionPhotos &&
                complaint.resolutionPhotos.length > 0)) && (
              <div
                className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-green-900/20 border-green-700"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
                    isDarkMode ? "text-green-300" : "text-green-700"
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Resolution Details</span>
                </h3>

                {complaint.resolutionNotes && (
                  <div className="mb-4">
                    <h4
                      className={`font-medium mb-2 ${
                        isDarkMode ? "text-green-200" : "text-green-800"
                      }`}
                    >
                      Resolution Notes
                    </h4>
                    <p
                      className={`leading-relaxed ${
                        isDarkMode ? "text-green-100" : "text-green-700"
                      }`}
                    >
                      {complaint.resolutionNotes}
                    </p>
                  </div>
                )}

                {complaint.resolvedAt && (
                  <div className="mb-4">
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-green-300" : "text-green-600"
                      }`}
                    >
                      <strong>Completed on:</strong>{" "}
                      {new Date(complaint.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {complaint.resolutionPhotos &&
                  complaint.resolutionPhotos.length > 0 && (
                    <div>
                      <h4
                        className={`font-medium mb-3 ${
                          isDarkMode ? "text-green-200" : "text-green-800"
                        }`}
                      >
                        Resolution Proof Photos (
                        {complaint.resolutionPhotos.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {complaint.resolutionPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo.url}
                              alt={`Resolution photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-green-200 dark:border-green-600"
                              onClick={() => setSelectedImage(photo)}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(
                                  photo.url,
                                  photo.originalName ||
                                    `resolution-photo-${index + 1}.jpg`
                                );
                              }}
                              className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
        </div>
      </motion.div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1
              className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Welcome back, {user?.name}!
            </h1>
            <p
              className={`mt-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Here's what's happening with your complaints today.
            </p>
          </div>

          <Link to="/client/create-complaint">
            <motion.button
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center space-x-2 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-5 w-5" />
              <span>New Complaint</span>
            </motion.button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 rounded-2xl shadow-lg border backdrop-blur-sm ${
                isDarkMode
                  ? "bg-gray-900/50 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {card.title}
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${card.bgColor} rounded-xl flex items-center justify-center`}
                >
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Complaints */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-6 rounded-2xl shadow-lg border backdrop-blur-sm ${
            isDarkMode
              ? "bg-gray-900/50 border-gray-800"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2
              className={`text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Recent Complaints
            </h2>
            <Link
              to="/client/complaints"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </Link>
          </div>

          {recentComplaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText
                className={`h-12 w-12 mx-auto mb-4 ${
                  isDarkMode ? "text-gray-600" : "text-gray-400"
                }`}
              />
              <p
                className={`text-lg font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No complaints yet
              </p>
              <p
                className={`mt-2 ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Create your first complaint to get started
              </p>
              <Link to="/client/create-complaint">
                <motion.button
                  className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
                  whileHover={{ scale: 1.02 }}
                >
                  Create Complaint
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentComplaints.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className={`p-4 rounded-xl border ${
                    isDarkMode
                      ? "bg-gray-700/50 border-gray-600"
                      : "bg-gray-50 border-gray-200"
                  } hover:shadow-md transition-all duration-200`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3
                          className={`font-semibold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {complaint.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {complaint.status.replace("-", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs font-medium capitalize ${getPriorityColor(
                            complaint.priority
                          )}`}
                        >
                          {complaint.priority}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        } line-clamp-2`}
                      >
                        {complaint.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-3 text-xs">
                        <span
                          className={`flex items-center space-x-1 ${
                            isDarkMode ? "text-gray-500" : "text-gray-500"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
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
                    </div>
                    <button
                      onClick={() => setSelectedComplaint(complaint)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Modals */}
        <AnimatePresence>
          {selectedComplaint && (
            <ComplaintDetailModal
              complaint={selectedComplaint}
              onClose={() => setSelectedComplaint(null)}
            />
          )}

          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              style={{
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={() => setSelectedImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-4xl max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedImage.url}
                  alt="Full size"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                <button
                  onClick={() =>
                    downloadImage(selectedImage.url, selectedImage.originalName)
                  }
                  className="absolute top-4 right-20 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <Download className="h-6 w-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
