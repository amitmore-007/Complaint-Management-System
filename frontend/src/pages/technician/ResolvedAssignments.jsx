import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Calendar,
  MapPin,
  User,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import useAuthStore from "../../store/authStore";
import { useResolvedComplaints } from "../../hooks/useComplaints";

const ResolvedAssignments = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();

  const resolvedQuery = useResolvedComplaints();
  const resolvedComplaints = Array.isArray(resolvedQuery.data)
    ? resolvedQuery.data
    : [];
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);

  useEffect(() => {
    if (!resolvedQuery.isError) return;

    const message =
      resolvedQuery.error?.response?.data?.message ||
      resolvedQuery.error?.message ||
      "Failed to load resolved assignments";
    toast.error(message);
  }, [resolvedQuery.isError, resolvedQuery.error]);

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

  if (resolvedQuery.isLoading) {
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
        {/* Header */}
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            My Resolved Assignments
          </h1>
          <p
            className={`mt-1 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            View all complaints you have successfully resolved
          </p>
        </div>

        {/* Photo Modal - keep existing dark overlay as it should stay dark */}
        {photoModalOpen && selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            onClick={closePhotoModal}
          >
            <div
              className="relative max-w-6xl max-h-[90vh] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePhotoModal}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>

              <img
                src={selectedPhoto.url}
                alt="Complaint photo"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />

              {currentComplaintPhotos && currentComplaintPhotos.length > 1 && (
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
          </motion.div>
        )}

        {/* Resolved Complaints List */}
        {resolvedComplaints.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <CheckCircle
              className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 ${
                isDarkMode ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <p
              className={`text-lg sm:text-xl font-medium mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No resolved assignments yet
            </p>
            <p
              className={`text-sm sm:text-base ${
                isDarkMode ? "text-gray-500" : "text-gray-500"
              }`}
            >
              Complaints you resolve will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {resolvedComplaints.map((complaint) => (
              <motion.div
                key={complaint._id}
                className={`border rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg ${
                  isDarkMode
                    ? "bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-green-500/5"
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
                        <span className="px-3 py-1 text-xs sm:text-sm font-semibold rounded-full text-green-600 bg-green-100 dark:bg-green-900/30 whitespace-nowrap">
                          RESOLVED
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold capitalize whitespace-nowrap ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
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
                                  ? "bg-gray-700 text-gray-300"
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
                            <strong>Resolved:</strong>{" "}
                            {new Date(complaint.updatedAt).toLocaleDateString()}
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

                    {/* Photos section with theme updates */}
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
                                        ? "border-gray-600"
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
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                                  isDarkMode
                                    ? "border-gray-600 text-gray-400 hover:bg-gray-700/50"
                                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                                }`}
                              >
                                +{complaint.photos.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Technician Notes */}
                    {complaint.technicianNotes && (
                      <div
                        className={`p-3 rounded-lg border ${
                          isDarkMode
                            ? "bg-green-900/20 border-green-700/50"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <p
                          className={`text-xs sm:text-sm ${
                            isDarkMode ? "text-green-300" : "text-green-700"
                          }`}
                        >
                          <strong>Resolution Notes:</strong>{" "}
                          {complaint.technicianNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex justify-center lg:ml-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResolvedAssignments;
