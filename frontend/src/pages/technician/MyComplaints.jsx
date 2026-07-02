import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Plus,
  AlertCircle,
  MapPin,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Copy,
  Pencil,
  Upload,
  ChevronDown,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useMyComplaints, useTechnicianDuplicateComplaint, useUpdateTechnicianComplaint } from "../../hooks/useComplaints";
import StoreDropdown from "../../components/common/StoreDropdown";
import STORE_OPTIONS from "../../utils/storeOptions";

const TechnicianMyComplaints = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const myComplaintsQuery = useMyComplaints();
  const duplicateMutation = useTechnicianDuplicateComplaint();
  const updateMutation = useUpdateTechnicianComplaint();
  const [editComplaint, setEditComplaint] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleDuplicate = (complaint) => {
    duplicateMutation.mutate(complaint._id, {
      onSuccess: (data) => {
        toast.success(`Complaint duplicated — new ID: ${data.complaint?.complaintId ?? "created"}`);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message ?? "Failed to duplicate complaint");
      },
    });
  };
  const complaints = Array.isArray(myComplaintsQuery.data)
    ? myComplaintsQuery.data
    : [];
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);

  useEffect(() => {
    if (!myComplaintsQuery.isError) return;

    const message =
      myComplaintsQuery.error?.response?.data?.message ||
      myComplaintsQuery.error?.message ||
      "Failed to load complaints";
    toast.error(message);
  }, [myComplaintsQuery.isError, myComplaintsQuery.error]);

  const openDetailModal = (complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedComplaint(null);
  };

  const openPhotoModal = (photos, initialIndex) => {
    setCurrentComplaintPhotos(photos);
    setCurrentPhotoIndex(initialIndex);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setCurrentPhotoIndex(0);
    setCurrentComplaintPhotos([]);
  };

  const handlePhotoNavigation = (direction) => {
    setCurrentPhotoIndex((prevIndex) => {
      const newIndex = direction === "next" ? prevIndex + 1 : prevIndex - 1;
      return Math.min(Math.max(newIndex, 0), currentComplaintPhotos.length - 1);
    });
  };

  const storeOptions = React.useMemo(() => {
    const map = new Map();
    (Array.isArray(STORE_OPTIONS) ? STORE_OPTIONS : []).forEach((name) => {
      const cleaned = String(name ?? "").trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (!map.has(key)) map.set(key, cleaned);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, []);

  const filteredComplaints = React.useMemo(() => {
    let filtered = complaints;

    if (statusFilter === "unresolved") {
      filtered = filtered.filter((c) => c.status !== "resolved");
    } else if (statusFilter !== "all") {
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
  }, [complaints, statusFilter, priorityFilter, locationFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredComplaints.length / itemsPerPage));

  const paginatedComplaints = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredComplaints.slice(start, start + itemsPerPage);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, locationFilter]);

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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

  if (myComplaintsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className={`text-2xl sm:text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              My Complaints
            </h1>
            <p
              className={`mt-1 text-sm sm:text-base ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Complaints you have created
            </p>
          </div>
          <motion.button
            onClick={() => navigate("/technician/create-complaint")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg flex items-center space-x-2 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Complaint</span>
          </motion.button>
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
                  placeholder="Search complaints..."
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
                  <option value="unresolved">Unresolved</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
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

        {/* Complaints List */}
        {complaints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center py-12 rounded-2xl border ${
              isDarkMode
                ? "bg-[#111] border-white/10"
                : "bg-white border-gray-200"
            }`}
          >
            <ClipboardList
              className={`h-16 w-16 mx-auto mb-4 ${
                isDarkMode ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <h3
              className={`text-xl font-semibold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              No complaints yet
            </h3>
            <p
              className={`mb-6 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Create your first complaint to get started
            </p>
            <button
              onClick={() => navigate("/technician/create-complaint")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg inline-flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create Complaint</span>
            </button>
          </motion.div>
        ) : filteredComplaints.length === 0 ? (
          <div className={`text-center py-10 rounded-2xl border ${isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"}`}>
            <p className={`text-base font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              No complaints match your filters
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {paginatedComplaints.map((complaint, index) => (
              <motion.div
                key={complaint._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 rounded-2xl border ${
                  isDarkMode
                    ? "bg-[#111] border-white/10"
                    : "bg-white border-gray-200"
                } hover:shadow-lg transition-all duration-200`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          complaint.status
                        )}`}
                      >
                        {complaint.status}
                      </span>
                      <span
                        className={`text-sm font-semibold ${getPriorityColor(
                          complaint.priority
                        )}`}
                      >
                        {complaint.priority}
                      </span>
                    </div>

                    <h3
                      className={`text-lg font-bold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {complaint.title}
                    </h3>

                    <p
                      className={`text-sm mb-3 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      } line-clamp-2`}
                    >
                      {complaint.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          {complaint.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {complaint.assignedTechnician && (
                      <div
                        className={`mt-3 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Assigned to:{" "}
                        <span className="font-semibold">
                          {complaint.assignedTechnician.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="relative self-start" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === complaint._id ? null : complaint._id)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                      title="More options"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>

                    {openMenuId === complaint._id && (
                      <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg border z-30 overflow-hidden ${isDarkMode ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"}`}>
                        <button
                          onClick={() => { openDetailModal(complaint); setOpenMenuId(null); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? "text-gray-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                          View
                        </button>
                        {complaint.status === "pending" && (
                          <button
                            onClick={() => { setEditComplaint(complaint); setOpenMenuId(null); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? "text-gray-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => { handleDuplicate(complaint); setOpenMenuId(null); }}
                          disabled={duplicateMutation.isPending}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors disabled:opacity-50 ${isDarkMode ? "text-gray-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          <Copy className="h-4 w-4 text-orange-500" />
                          Duplicate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredComplaints.length > itemsPerPage && (
          <div className="flex items-center justify-between pt-2">
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredComplaints.length)} of {filteredComplaints.length}
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

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedComplaint && (
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
              onClick={closeDetailModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`rounded-2xl p-6 w-full max-w-3xl max-h-[95vh] overflow-y-auto mx-4 my-4 ${
                  isDarkMode ? "bg-[#111]" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2
                      className={`text-2xl font-bold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedComplaint.title}
                    </h2>
                    <p
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      } mt-1`}
                    >
                      ID: {selectedComplaint.complaintId}
                    </p>
                  </div>
                  <button
                    onClick={closeDetailModal}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"
                    }`}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Status & Priority
                    </h3>
                    <div className="flex gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                          selectedComplaint.status
                        )}`}
                      >
                        {selectedComplaint.status}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(
                          selectedComplaint.priority
                        )}`}
                      >
                        {selectedComplaint.priority} priority
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Description
                    </h3>
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                    >
                      {selectedComplaint.description}
                    </p>
                  </div>

                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Location
                    </h3>
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                    >
                      {selectedComplaint.location}
                    </p>
                  </div>

                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Outlet Managers
                    </h3>
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                    >
                      {selectedComplaint.store?.managers?.length
                        ? selectedComplaint.store.managers
                            .map((m) => `${m.name} (${m.phoneNumber})`)
                            .join(", ")
                        : "—"}
                    </p>
                  </div>

                  {selectedComplaint.photos &&
                    selectedComplaint.photos.length > 0 && (
                      <div>
                        <h3
                          className={`font-semibold mb-2 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Photos
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {selectedComplaint.photos.map((photo, index) => (
                            <img
                              key={index}
                              src={photo.url}
                              alt={`Complaint ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() =>
                                openPhotoModal(selectedComplaint.photos, index)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedComplaint.assignedTechnician && (
                    <div>
                      <h3
                        className={`font-semibold mb-2 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Assigned Technician
                      </h3>
                      <p
                        className={
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }
                      >
                        {selectedComplaint.assignedTechnician.name} (
                        {selectedComplaint.assignedTechnician.phoneNumber})
                      </p>
                    </div>
                  )}

                  <div>
                    <h3
                      className={`font-semibold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Created Date
                    </h3>
                    <p
                      className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                    >
                      {new Date(selectedComplaint.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo Modal */}
        <AnimatePresence>
          {photoModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              onClick={closePhotoModal}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={currentComplaintPhotos[currentPhotoIndex]?.url}
                  alt="Full size"
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />

                {currentComplaintPhotos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePhotoNavigation("prev");
                      }}
                      disabled={currentPhotoIndex === 0}
                      className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePhotoNavigation("next");
                      }}
                      disabled={
                        currentPhotoIndex === currentComplaintPhotos.length - 1
                      }
                      className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-6 w-6 text-white" />
                    </button>
                  </>
                )}

                <button
                  onClick={closePhotoModal}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
                >
                  <X className="h-6 w-6 text-white" />
                </button>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
                  {currentPhotoIndex + 1} / {currentComplaintPhotos.length}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Complaint Modal */}
        <AnimatePresence>
          {editComplaint && (
            <EditComplaintModal
              complaint={editComplaint}
              isDarkMode={isDarkMode}
              updateMutation={updateMutation}
              onClose={() => setEditComplaint(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

const EditComplaintModal = ({ complaint, isDarkMode, updateMutation, onClose }) => {
  const [formData, setFormData] = useState({
    title: complaint.title || "",
    description: complaint.description || "",
    location: complaint.location || "",
    priority: complaint.priority || "medium",
    store: complaint.store?._id || complaint.store || "",
  });
  const [existingPhotos, setExistingPhotos] = useState(complaint.photos || []);
  const [newPhotos, setNewPhotos] = useState([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { newPhotos.forEach((p) => URL.revokeObjectURL(p.preview)); };
  }, []);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const total = existingPhotos.length - removedPhotoIds.length + newPhotos.length + files.length;
    if (total > 5) { toast.error("Maximum 5 photos allowed"); return; }
    setNewPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file), id: Math.random().toString(36).substr(2, 9) })),
    ]);
    e.target.value = "";
  };

  const removeExistingPhoto = (publicId) => setRemovedPhotoIds((prev) => [...prev, publicId]);
  const restoreExistingPhoto = (publicId) => setRemovedPhotoIds((prev) => prev.filter((id) => id !== publicId));
  const removeNewPhoto = (id) => {
    setNewPhotos((prev) => {
      const toRemove = prev.find((p) => p.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload;
    if (newPhotos.length > 0 || removedPhotoIds.length > 0) {
      payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v) payload.append(k, v); });
      newPhotos.forEach((p) => payload.append("photos", p.file));
      removedPhotoIds.forEach((id) => payload.append("removedPhotos", id));
    } else {
      payload = { ...formData };
      if (!payload.store) delete payload.store;
    }
    updateMutation.mutate(
      { complaintId: complaint._id, payload },
      {
        onSuccess: () => { toast.success("Complaint updated successfully"); onClose(); },
        onError: (err) => { toast.error(err?.response?.data?.message ?? "Failed to update complaint"); },
      },
    );
  };

  const inputCls = `w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
    isDarkMode
      ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  }`;
  const labelCls = `block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-4 my-4 rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-[#111] dark-scrollbar" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 p-6 border-b z-10 ${isDarkMode ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"}`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Edit Complaint</h2>
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-white/10" : "hover:bg-gray-100"}`}>
              <X className={`h-6 w-6 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className={`${inputCls} resize-none`} />
          </div>

          {/* Location */}
          <div>
            <label className={labelCls}>Location *</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} required className={inputCls} />
          </div>

          {/* Store */}
          <div>
            <label className={labelCls}>Store</label>
            <StoreDropdown
              value={formData.store}
              onChange={(val) => setFormData((prev) => ({ ...prev, store: val }))}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Priority */}
          <div>
            <label className={labelCls}>Priority</label>
            <div className="relative">
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full pl-4 pr-10 py-3 border rounded-xl text-sm appearance-none cursor-pointer transition-all duration-200 ${
                  isDarkMode
                    ? "bg-[#1a1a1a] border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className={labelCls}>Photos (Max 5)</label>

            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className={`text-xs mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Current Photos</p>
                <div className="grid grid-cols-3 gap-3">
                  {existingPhotos.map((photo) => (
                    <div key={photo.publicId} className="relative">
                      <img
                        src={photo.url}
                        alt="existing"
                        className={`w-full h-24 object-cover rounded-lg border ${removedPhotoIds.includes(photo.publicId) ? "opacity-40" : ""} ${isDarkMode ? "border-white/10" : "border-gray-200"}`}
                      />
                      {removedPhotoIds.includes(photo.publicId) ? (
                        <button type="button" onClick={() => restoreExistingPhoto(photo.publicId)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600">
                          <Plus className="h-3 w-3" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => removeExistingPhoto(photo.publicId)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {newPhotos.length > 0 && (
              <div className="mb-4">
                <p className={`text-xs mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>New Photos</p>
                <div className="grid grid-cols-3 gap-3">
                  {newPhotos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img src={photo.preview} alt="new" className={`w-full h-24 object-cover rounded-lg border ${isDarkMode ? "border-white/10" : "border-gray-200"}`} />
                      <button type="button" onClick={() => removeNewPhoto(photo.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingPhotos.length - removedPhotoIds.length + newPhotos.length < 5 && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 transition-colors ${
                    isDarkMode ? "border-white/20 hover:border-white/40 text-gray-400" : "border-gray-300 hover:border-gray-400 text-gray-500"
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Add photos</span>
                </button>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TechnicianMyComplaints;
