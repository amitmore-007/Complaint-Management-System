import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  UserPlus,
  Calendar,
  MapPin,
  Users,
  X,
  Check,
  Clock,
  Phone,
  CheckCircle,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import api from "../../lib/axios";

const ComplaintManagement = () => {
  const { isDarkMode } = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchTechnicians();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter, priorityFilter]);

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/admin/complaints");
      setComplaints(response.data.complaints);
    } catch (error) {
      console.error("Failed to fetch complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await api.get("/admin/technicians?limit=100");

      setTechnicians(response.data.technicians);
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
      toast.error("Failed to load technicians");
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (complaint) => complaint.status === statusFilter
      );
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (complaint) => complaint.priority === priorityFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (complaint) =>
          complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          complaint.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          complaint.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          complaint.complaintId
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          complaint.client?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          complaint.createdByTechnician?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          complaint.createdByAdmin?.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredComplaints(filtered);
  };

  const handleAssignComplaint = async () => {
    if (!selectedComplaint || !selectedTechnician) {
      toast.error("Please select a technician");
      return;
    }

    try {
      setIsAssigning(true);
      await api.post("/admin/complaints/assign", {
        complaintId: selectedComplaint._id,
        technicianId: selectedTechnician,
      });

      toast.success("Complaint assigned successfully!");
      setShowAssignModal(false);
      setSelectedComplaint(null);
      setSelectedTechnician("");
      fetchComplaints();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to assign complaint"
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setShowAssignModal(true);
  };

  const openDetailsModal = async (complaint) => {
    try {
      const response = await api.get(`/admin/complaints/${complaint._id}`);
      setSelectedComplaint(response.data.complaint);
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Failed to fetch complaint details:", error);
      toast.error("Failed to load complaint details");
    }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedComplaint(null);
    setSelectedTechnician("");
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedComplaint(null);
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Complaint Management
          </h1>
          <p
            className={`mt-2 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Review, assign, and manage all complaints
          </p>
        </div>

        {/* Filters */}
        <div
          className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 sm:py-3 border rounded-xl transition-all duration-200 text-sm sm:text-base ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  }`}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 sm:py-3 border rounded-xl transition-all duration-200 text-sm sm:text-base ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`w-full px-4 py-2 sm:py-3 border rounded-xl transition-all duration-200 text-sm sm:text-base ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                }`}
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {filteredComplaints.length === 0 ? (
            <div
              className={`text-center py-8 sm:py-12 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-lg`}
            >
              <p
                className={`text-base sm:text-lg font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {searchTerm ||
                statusFilter !== "all" ||
                priorityFilter !== "all"
                  ? "No complaints match your filters"
                  : "No complaints yet"}
              </p>
            </div>
          ) : (
            filteredComplaints.map((complaint) => (
              <motion.div
                key={complaint._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                } hover:shadow-xl transition-all duration-200`}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <h3
                        className={`text-lg sm:text-xl font-semibold truncate ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {complaint.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {complaint.status.replace("-", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-medium capitalize whitespace-nowrap ${getPriorityColor(
                            complaint.priority
                          )}`}
                        >
                          {complaint.priority} Priority
                        </span>
                      </div>
                    </div>

                    <p
                      className={`mb-4 text-sm sm:text-base line-clamp-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
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
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            <strong>Creator:</strong>{" "}
                            {complaint.client?.name ||
                              complaint.createdByAdmin?.name ||
                              complaint.createdByTechnician?.name ||
                              "N/A"}
                            <span
                              className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
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
                      </div>

                      <div className="space-y-2">
                        <div
                          className={`flex items-center space-x-2 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            <strong>Created:</strong>{" "}
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          } whitespace-nowrap`}
                        >
                          <strong>ID:</strong> {complaint.complaintId}
                        </div>
                      </div>
                    </div>

                    {complaint.assignedTechnician && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p
                          className={`text-xs sm:text-sm ${
                            isDarkMode ? "text-blue-300" : "text-blue-700"
                          }`}
                        >
                          <strong>Assigned to:</strong>{" "}
                          {complaint.assignedTechnician.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col items-center gap-2 lg:ml-4 justify-end lg:justify-start">
                    <button
                      onClick={() => openDetailsModal(complaint)}
                      className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    {complaint.status === "pending" && (
                      <button
                        onClick={() => openAssignModal(complaint)}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 flex items-center space-x-2 text-sm whitespace-nowrap"
                      >
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Assign</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Assignment Modal */}
        <AnimatePresence>
          {showAssignModal && (
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
              onClick={closeAssignModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-md max-h-[95vh] overflow-y-auto mx-4 my-4 rounded-2xl shadow-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3
                      className={`text-xl font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Assign Technician
                    </h3>
                    <button
                      onClick={closeAssignModal}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {selectedComplaint && (
                    <div className="mb-6">
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
                        Creator:{" "}
                        {selectedComplaint.client?.name ||
                          selectedComplaint.createdByAdmin?.name ||
                          selectedComplaint.createdByTechnician?.name ||
                          "N/A"}{" "}
                        ({selectedComplaint.creatorType || "client"}) |
                        Location: {selectedComplaint.location}
                      </p>
                    </div>
                  )}

                  <div className="mb-6">
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Select Technician (
                      {technicians.filter((t) => t.isActive).length} available)
                    </label>
                    <select
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      }`}
                    >
                      <option value="">Select a technician...</option>
                      {technicians
                        .filter((tech) => tech.isActive)
                        .map((tech) => (
                          <option key={tech._id} value={tech._id}>
                            {tech.name} ({tech.activeAssignments || 0} active,{" "}
                            {tech.completedAssignments || 0} completed)
                          </option>
                        ))}
                    </select>
                    {technicians.filter((t) => t.isActive).length === 0 && (
                      <p className="text-sm text-red-500 mt-2">
                        No active technicians available
                      </p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Technicians can handle multiple assignments simultaneously
                    </p>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={closeAssignModal}
                      className={`flex-1 py-3 px-4 border rounded-xl font-semibold transition-all duration-200 ${
                        isDarkMode
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleAssignComplaint}
                      disabled={!selectedTechnician || isAssigning}
                      className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isAssigning ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          <span>Assign</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
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
                className={`w-full max-w-2xl max-h-[95vh] mx-4 my-4 overflow-hidden rounded-2xl shadow-2xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`p-6 border-b ${
                    isDarkMode
                      ? "border-gray-700 bg-gray-800"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h3
                      className={`text-xl font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Complaint Details
                    </h3>
                    <button
                      onClick={closeDetailsModal}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[calc(95vh-88px)]">
                  <div className="p-6 space-y-6">
                    {/* Complaint Info */}
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <h4
                          className={`text-lg font-semibold ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {selectedComplaint.title}
                        </h4>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                            selectedComplaint.status
                          )}`}
                        >
                          {selectedComplaint.status
                            .replace("-", " ")
                            .toUpperCase()}
                        </span>
                        <span
                          className={`text-sm font-medium capitalize ${getPriorityColor(
                            selectedComplaint.priority
                          )}`}
                        >
                          {selectedComplaint.priority} Priority
                        </span>
                      </div>
                      <p
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {selectedComplaint.description}
                      </p>
                    </div>

                    {/* Client and Location Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5
                          className={`font-medium mb-2 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Creator Information
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <Users className="h-4 w-4" />
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
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <Phone className="h-4 w-4" />
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

                      <div>
                        <h5
                          className={`font-medium mb-2 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Complaint Details
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <MapPin className="h-4 w-4" />
                            <span>{selectedComplaint.location}</span>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(
                                selectedComplaint.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            <span>ID: {selectedComplaint.complaintId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technician Info */}
                    {selectedComplaint.assignedTechnician && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h5
                          className={`font-medium mb-2 ${
                            isDarkMode ? "text-blue-300" : "text-blue-700"
                          }`}
                        >
                          Assigned Technician
                        </h5>
                        <div className="space-y-1 text-sm">
                          <p
                            className={
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }
                          >
                            <strong>Name:</strong>{" "}
                            {selectedComplaint.assignedTechnician.name}
                          </p>
                          <p
                            className={
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }
                          >
                            <strong>Phone:</strong>{" "}
                            {selectedComplaint.assignedTechnician.phoneNumber}
                          </p>
                          {selectedComplaint.assignedAt && (
                            <p
                              className={
                                isDarkMode ? "text-blue-300" : "text-blue-700"
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
                    <div>
                      <h5
                        className={`font-medium mb-3 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Timeline
                      </h5>
                      <div className="space-y-3">
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
                              className={`text-sm ${
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
                              <UserPlus className="h-4 w-4 text-white" />
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
                                className={`text-sm ${
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
                              <Clock className="h-4 w-4 text-white" />
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
                                className={`text-sm ${
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
                                className={`text-sm ${
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
                        <div>
                          <h5
                            className={`font-medium mb-2 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Photos ({selectedComplaint.photos.length})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {selectedComplaint.photos.map((photo, index) => (
                              <img
                                key={index}
                                src={photo.url}
                                alt={`Complaint photo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Technician Notes */}
                    {selectedComplaint.technicianNotes && (
                      <div>
                        <h5
                          className={`font-medium mb-2 ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          Technician Notes
                        </h5>
                        <p
                          className={`p-3 rounded-lg ${
                            isDarkMode
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
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
                          className={`p-4 rounded-lg border ${
                            isDarkMode
                              ? "bg-green-900/20 border-green-700"
                              : "bg-green-50 border-green-200"
                          }`}
                        >
                          <h5
                            className={`font-medium mb-4 flex items-center space-x-2 ${
                              isDarkMode ? "text-green-300" : "text-green-700"
                            }`}
                          >
                            <CheckCircle className="h-5 w-5" />
                            <span>Resolution Details</span>
                          </h5>

                          {selectedComplaint.resolutionNotes && (
                            <div className="mb-4">
                              <h6
                                className={`font-medium mb-2 ${
                                  isDarkMode
                                    ? "text-green-200"
                                    : "text-green-800"
                                }`}
                              >
                                Resolution Notes
                              </h6>
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
                                <h6
                                  className={`font-medium mb-3 ${
                                    isDarkMode
                                      ? "text-green-200"
                                      : "text-green-800"
                                  }`}
                                >
                                  Resolution Proof Photos (
                                  {selectedComplaint.resolutionPhotos.length})
                                </h6>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {selectedComplaint.resolutionPhotos.map(
                                    (photo, index) => (
                                      <img
                                        key={index}
                                        src={photo.url}
                                        alt={`Resolution photo ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border-2 border-green-300 dark:border-green-600"
                                      />
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
      </div>
    </DashboardLayout>
  );
};

export default ComplaintManagement;
