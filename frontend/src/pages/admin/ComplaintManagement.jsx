import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import writeXlsxFile from "write-excel-file/browser";
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
  Loader2,
  Download,
  Share2,
  ChevronDown,
  Copy,
  Pencil,
  Upload,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StoreDropdown from "../../components/common/StoreDropdown";
import { complaintService } from "../../services/complaintService";
import {
  useComplaints,
  useComplaint,
  useAssignComplaint,
  useReassignComplaint,
  useAdminDuplicateComplaint,
  useUpdateAdminComplaint,
} from "../../hooks/useComplaints";
import { useAdminTechnicians } from "../../hooks/useAdmin";
import STORE_OPTIONS from "../../utils/storeOptions";
import VideoPlayer from "../../components/player/VideoPlayer";

const ComplaintManagement = () => {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [selectedAssignComplaint, setSelectedAssignComplaint] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [isReassignMode, setIsReassignMode] = useState(false);
  const [isExportingComplaints, setIsExportingComplaints] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // React Query hooks
  const { data: complaints = [], isLoading } = useComplaints({
    fetchAll: true,
  });
  const { data: complaintDetails, isLoading: isLoadingDetails } = useComplaint(
    selectedComplaintId,
    { enabled: showDetailsModal && !!selectedComplaintId, role: "admin" },
  );
  const assignComplaintMutation = useAssignComplaint();
  const reassignComplaintMutation = useReassignComplaint();
  const duplicateMutation = useAdminDuplicateComplaint();
  const updateMutation = useUpdateAdminComplaint();
  const [editComplaint, setEditComplaint] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

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
  const isAssigning =
    assignComplaintMutation.isPending || reassignComplaintMutation.isPending;

  const { data: techniciansData } = useAdminTechnicians({
    page: 1,
    limit: 100,
  });
  const technicians = techniciansData?.technicians ?? [];

  const storeOptions = React.useMemo(() => {
    const valuesByKey = new Map();

    (Array.isArray(STORE_OPTIONS) ? STORE_OPTIONS : []).forEach((name) => {
      const cleaned = String(name ?? "").trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (!valuesByKey.has(key)) valuesByKey.set(key, cleaned);
    });

    return Array.from(valuesByKey.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, []);

  const filteredComplaints = React.useMemo(() => {
    let filtered = complaints;

    // Filter by status
    if (statusFilter === "unresolved") {
      filtered = filtered.filter(
        (complaint) => complaint.status !== "resolved",
      );
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(
        (complaint) => complaint.status === statusFilter,
      );
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (complaint) => complaint.priority === priorityFilter,
      );
    }

    // Filter by store/location
    if (locationFilter !== "all") {
      const selected = String(locationFilter).trim().toLowerCase();
      filtered = filtered.filter((complaint) => {
        const value = String(
          complaint?.store?.name ?? complaint?.location ?? "",
        )
          .trim()
          .toLowerCase();
        return value === selected;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (complaint) =>
          complaint.title.toLowerCase().includes(q) ||
          complaint.description.toLowerCase().includes(q) ||
          String(complaint.store?.name ?? "")
            .toLowerCase()
            .includes(q) ||
          complaint.location.toLowerCase().includes(q) ||
          complaint.complaintId.toLowerCase().includes(q) ||
          complaint.client?.name.toLowerCase().includes(q) ||
          complaint.createdByTechnician?.name.toLowerCase().includes(q) ||
          complaint.createdByAdmin?.name.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [complaints, statusFilter, priorityFilter, locationFilter, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredComplaints.length / itemsPerPage),
  );

  const paginatedComplaints = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredComplaints.slice(start, start + itemsPerPage);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, locationFilter, itemsPerPage]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleAssignComplaint = async () => {
    if (!selectedTechnician) {
      toast.error("Please select a technician");
      return;
    }

    if (isAssigning) return;

    try {
      if (isReassignMode) {
        await reassignComplaintMutation.mutateAsync({
          complaintId: selectedAssignComplaint._id,
          technicianId: selectedTechnician,
        });
        toast.success("Complaint reassigned successfully!");
      } else {
        await assignComplaintMutation.mutateAsync({
          complaintId: selectedAssignComplaint._id,
          technicianId: selectedTechnician,
        });
        toast.success("Complaint assigned successfully!");
      }

      setShowAssignModal(false);
      setSelectedTechnician("");
      setIsReassignMode(false);
    } catch (error) {
      console.error("Failed to assign complaint:", error);
      toast.error(
        error.response?.data?.message ||
          (isReassignMode ? "Failed to reassign complaint" : "Failed to assign complaint"),
      );
    }
  };

  const openAssignModal = (complaint) => {
    setIsReassignMode(false);
    setSelectedAssignComplaint(complaint);
    setShowAssignModal(true);
  };

  const openReassignModal = (complaint) => {
    setIsReassignMode(true);
    setSelectedAssignComplaint(complaint);
    setSelectedTechnician("");
    setShowAssignModal(true);
  };

  const openDetailsModal = async (complaint) => {
    setSelectedComplaintId(complaint._id);
    setShowDetailsModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedAssignComplaint(null);
    setSelectedTechnician("");
    setIsReassignMode(false);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedComplaintId(null);
  };

  const buildWhatsAppShareUrl = (complaint) => {
    const technician = complaint.assignedTechnician?.name;
    const statusLabel = complaint.status.replace("-", " ").toUpperCase();

    const lines = [
      `*Complaint Update — CMS*`,
      ``,
      `*Issue:* ${complaint.title}`,
      `*Status:* ${statusLabel}`,
      complaint.resolutionNotes
        ? `*Resolution:* ${complaint.resolutionNotes}`
        : null,
      (complaint.resolvedAt || complaint.completedAt)
        ? `*Resolved on:* ${new Date(complaint.resolvedAt || complaint.completedAt).toLocaleString()}`
        : null,
      ``,
      `_Shared via Constro CMS`,
    ];

    const message = lines.filter((l) => l !== null).join("\n");
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handleShareOnWhatsApp = (complaint) => {
    window.open(buildWhatsAppShareUrl(complaint), "_blank", "noopener,noreferrer");
  };

  const handleDownloadAllComplaints = async () => {
    if (isExportingComplaints) return;

    setIsExportingComplaints(true);
    try {
      const allComplaints = await complaintService.admin.listAll({
        limit: 500,
      });

      if (!allComplaints.length) {
        toast.error("No complaints found to export");
        return;
      }

      const rows = allComplaints.map((complaint) => ({
        complaintId: complaint?.complaintId || "",
        title: complaint?.title || "",
        description: complaint?.description || "",
        status: complaint?.status || "",
        priority: complaint?.priority || "",
        location: complaint?.location || "",
        creatorType: complaint?.creatorType || "",
        creatorName:
          complaint?.client?.name ||
          complaint?.createdByAdmin?.name ||
          complaint?.createdByTechnician?.name ||
          "",
        assignedTechnician: complaint?.assignedTechnician?.name || "",
        assignedBy: complaint?.assignedBy?.name || "",
        assignedAt: complaint?.assignedAt
          ? new Date(complaint.assignedAt).toLocaleString()
          : "",
        createdAt: complaint?.createdAt
          ? new Date(complaint.createdAt).toLocaleString()
          : "",
      }));

      const schema = [
        {
          column: "Complaint ID",
          type: String,
          width: 18,
          height: 22,
          value: (r) => r.complaintId,
        },
        {
          column: "Title",
          type: String,
          width: 30,
          height: 22,
          wrap: true,
          value: (r) => r.title,
        },
        {
          column: "Description",
          type: String,
          width: 45,
          height: 22,
          wrap: true,
          value: (r) => r.description,
        },
        {
          column: "Status",
          type: String,
          width: 14,
          height: 22,
          value: (r) => r.status,
        },
        {
          column: "Priority",
          type: String,
          width: 12,
          height: 22,
          value: (r) => r.priority,
        },
        {
          column: "Store",
          type: String,
          width: 24,
          height: 22,
          value: (r) => r.location,
        },
        {
          column: "Creator Type",
          type: String,
          width: 14,
          height: 22,
          value: (r) => r.creatorType,
        },
        {
          column: "Creator",
          type: String,
          width: 22,
          height: 22,
          value: (r) => r.creatorName,
        },
        {
          column: "Assigned Technician",
          type: String,
          width: 24,
          height: 22,
          value: (r) => r.assignedTechnician,
        },
        {
          column: "Assigned By",
          type: String,
          width: 20,
          height: 22,
          value: (r) => r.assignedBy,
        },
        {
          column: "Assigned At",
          type: String,
          width: 22,
          height: 22,
          value: (r) => r.assignedAt,
        },
        {
          column: "Created At",
          type: String,
          width: 22,
          height: 22,
          value: (r) => r.createdAt,
        },
      ];

      const dateTag = new Date().toISOString().slice(0, 10);
      await writeXlsxFile(rows, {
        schema,
        getHeaderStyle: () => ({
          fontWeight: "bold",
          fontSize: 13,
          textColor: "#ffffff",
          backgroundColor: "#1f4e78",
          align: "center",
          alignVertical: "center",
          height: 26,
        }),
        fileName: `all-complaints-${dateTag}.xlsx`,
      });

      toast.success(`Downloaded ${rows.length} complaints`);
    } catch (error) {
      console.error("Failed to export complaints:", error);
      toast.error("Failed to download complaints Excel");
    } finally {
      setIsExportingComplaints(false);
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
        return "text-gray-600 bg-gray-100 dark:bg-white/5";
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

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownloadAllComplaints}
            disabled={isExportingComplaints}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isExportingComplaints ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Download All</span>
          </button>
        </div>

        {/* Filters */}
        <div
          className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${
            isDarkMode
              ? "bg-[#111] border-white/10"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-all duration-200 text-sm ${
                    isDarkMode
                      ? "bg-white/10 border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full pl-4 pr-10 py-2 border rounded-lg appearance-none cursor-pointer transition-all duration-200 text-sm ${
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

            {/* Priority Filter */}
            <div>
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`w-full pl-4 pr-10 py-2 border rounded-lg appearance-none cursor-pointer transition-all duration-200 text-sm ${
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

            {/* Location / Store Filter */}
            <div>
              <StoreDropdown
                isDarkMode={isDarkMode}
                options={["All Stores", ...storeOptions]}
                value={locationFilter === "all" ? "All Stores" : locationFilter}
                onChange={(picked) =>
                  setLocationFilter(picked === "All Stores" ? "all" : picked)
                }
                placeholder="All Stores"
                compact
                inputClassName="h-[38px] py-0 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {filteredComplaints.length === 0 ? (
            <div
              className={`text-center py-8 sm:py-12 rounded-2xl ${
                isDarkMode ? "bg-[#111]" : "bg-white"
              } shadow-lg`}
            >
              <p
                className={`text-base sm:text-lg font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {locationFilter !== "all"
                  ? `No complaints for ${locationFilter}`
                  : searchTerm ||
                      statusFilter !== "all" ||
                      priorityFilter !== "all"
                    ? "No complaints match your filters"
                    : "No complaints yet"}
              </p>
            </div>
          ) : (
            paginatedComplaints.map((complaint) => (
              <motion.div
                key={complaint._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${
                  isDarkMode
                    ? "bg-[#111] border-white/10"
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
                            complaint.status,
                          )}`}
                        >
                          {complaint.status.replace("-", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-medium capitalize whitespace-nowrap ${getPriorityColor(
                            complaint.priority,
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
                    {/* 3-dot menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === complaint._id ? null : complaint._id)}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                        title="More options"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {openMenuId === complaint._id && (
                        <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-30 overflow-hidden ${isDarkMode ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"}`}>
                          <button
                            onClick={() => { openDetailsModal(complaint); setOpenMenuId(null); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? "text-gray-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Eye className="h-4 w-4 text-primary-500" />
                            View Details
                          </button>
                          <button
                            onClick={() => { setEditComplaint(complaint); setOpenMenuId(null); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? "text-gray-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                            Edit
                          </button>
                          <button
                            onClick={() => { handleShareOnWhatsApp(complaint); setOpenMenuId(null); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isDarkMode ? "text-gray-200 hover:bg-white/10" : "text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Share2 className="h-4 w-4 text-green-500" />
                            Share
                          </button>
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

                    {complaint.status === "pending" && (
                      <button
                        onClick={() => openAssignModal(complaint)}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm whitespace-nowrap"
                      >
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Assign</span>
                      </button>
                    )}

                    {(complaint.status === "assigned" ||
                      complaint.status === "in-progress") && (
                      <button
                        onClick={() => openReassignModal(complaint)}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm whitespace-nowrap"
                      >
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Reassign</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {filteredComplaints.length > 0 && (
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              isDarkMode
                ? "bg-[#111] border-white/10 text-gray-300"
                : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            <div className="flex items-center gap-3 text-sm">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(
                  currentPage * itemsPerPage,
                  filteredComplaints.length,
                )}{" "}
                of {filteredComplaints.length}
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="complaints-page-size">Rows:</label>
                <div className="relative">
                  <select
                    id="complaints-page-size"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className={`pl-2 pr-6 py-1 rounded-md border text-sm appearance-none cursor-pointer ${
                      isDarkMode
                        ? "bg-[#1a1a1a] border-white/10 text-white"
                        : "bg-white border-gray-300 text-gray-800"
                    }`}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

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
                  isDarkMode ? "bg-[#111]" : "bg-white"
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
                      {isReassignMode ? "Reassign Technician" : "Assign Technician"}
                    </h3>
                    <button
                      onClick={closeAssignModal}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {selectedAssignComplaint && (
                    <div className="mb-6">
                      <h4
                        className={`font-medium mb-1 ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {selectedAssignComplaint.title}
                      </h4>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Creator:{" "}
                        {selectedAssignComplaint.client?.name ||
                          selectedAssignComplaint.createdByAdmin?.name ||
                          selectedAssignComplaint.createdByTechnician?.name ||
                          "N/A"}{" "}
                        ({selectedAssignComplaint.creatorType || "client"}) |
                        Location: {selectedAssignComplaint.location}
                      </p>

                      {isReassignMode &&
                        selectedAssignComplaint.assignedTechnician && (
                          <div
                            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                              isDarkMode
                                ? "bg-amber-900/30 text-amber-300 border border-amber-700/40"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            <UserPlus className="h-4 w-4 shrink-0" />
                            <span>
                              Currently assigned to{" "}
                              <strong>
                                {selectedAssignComplaint.assignedTechnician.name}
                              </strong>
                              . Selecting a new technician will reassign and
                              reset the status to{" "}
                              <strong>Assigned</strong>.
                            </span>
                          </div>
                        )}
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
                    <div className="relative">
                      <select
                        value={selectedTechnician}
                        onChange={(e) => setSelectedTechnician(e.target.value)}
                        className={`w-full pl-4 pr-10 py-3 border rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
                          isDarkMode
                            ? "bg-[#1a1a1a] border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
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
                      className={`flex-1 py-2.5 px-4 border rounded-lg font-semibold transition-all duration-200 ${
                        isDarkMode
                          ? "border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleAssignComplaint}
                      disabled={!selectedTechnician || isAssigning}
                      className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAssigning ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          <span>{isReassignMode ? "Reassign" : "Assign"}</span>
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
          {showDetailsModal && complaintDetails && (
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
                  isDarkMode ? "bg-[#111]" : "bg-white"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`p-6 border-b ${
                    isDarkMode
                      ? "border-white/10 bg-[#111]"
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleShareOnWhatsApp(complaintDetails)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 transition-colors"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                      <button
                        onClick={closeDetailsModal}
                        className={`p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
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
                          {complaintDetails.title}
                        </h4>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                            complaintDetails.status,
                          )}`}
                        >
                          {complaintDetails.status
                            .replace("-", " ")
                            .toUpperCase()}
                        </span>
                        <span
                          className={`text-sm font-medium capitalize ${getPriorityColor(
                            complaintDetails.priority,
                          )}`}
                        >
                          {complaintDetails.priority} Priority
                        </span>
                      </div>
                      <p
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {complaintDetails.description}
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
                              {complaintDetails.client?.name ||
                                complaintDetails.createdByAdmin?.name ||
                                complaintDetails.createdByTechnician?.name ||
                                "N/A"}
                              <span
                                className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  isDarkMode
                                    ? "bg-white/10 text-gray-300"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {complaintDetails.creatorType || "client"}
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
                              {complaintDetails.client?.phoneNumber ||
                                complaintDetails.createdByAdmin?.phoneNumber ||
                                complaintDetails.createdByTechnician
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
                            <span>{complaintDetails.location}</span>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(
                                complaintDetails.createdAt,
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            <span>ID: {complaintDetails.complaintId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technician Info */}
                    {complaintDetails.assignedTechnician && (
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
                            {complaintDetails.assignedTechnician.name}
                          </p>
                          <p
                            className={
                              isDarkMode ? "text-blue-300" : "text-blue-700"
                            }
                          >
                            <strong>Phone:</strong>{" "}
                            {complaintDetails.assignedTechnician.phoneNumber}
                          </p>
                          {complaintDetails.assignedAt && (
                            <p
                              className={
                                isDarkMode ? "text-blue-300" : "text-blue-700"
                              }
                            >
                              <strong>Assigned:</strong>{" "}
                              {new Date(
                                complaintDetails.assignedAt,
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
                              {complaintDetails.createdAt
                                ? new Date(
                                    complaintDetails.createdAt,
                                  ).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                        </div>

                        {complaintDetails.assignedAt && (
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
                                  complaintDetails.assignedAt,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {complaintDetails.startedAt && (
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
                                  complaintDetails.startedAt,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {(complaintDetails.completedAt ||
                          complaintDetails.resolvedAt) && (
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
                                  complaintDetails.completedAt ||
                                    complaintDetails.resolvedAt,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photos */}
                    {complaintDetails.photos &&
                      complaintDetails.photos.length > 0 && (
                        <div>
                          <h5
                            className={`font-medium mb-2 ${
                              isDarkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Photos ({complaintDetails.photos.length})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {complaintDetails.photos.map((photo, index) => (
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
                    {complaintDetails.technicianNotes && (
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
                              ? "bg-white/10 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {complaintDetails.technicianNotes}
                        </p>
                      </div>
                    )}

                    {/* Resolution Data - Only show for resolved complaints */}
                    {complaintDetails.status === "resolved" &&
                      (complaintDetails.resolutionNotes ||
                        complaintDetails.resolutionPhotos?.length > 0 ||
                        complaintDetails.resolutionVideos?.length > 0) && (
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

                          {complaintDetails.resolutionNotes && (
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
                                {complaintDetails.resolutionNotes}
                              </p>
                            </div>
                          )}

                          {complaintDetails.resolvedAt && (
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
                                  complaintDetails.resolvedAt,
                                ).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {complaintDetails.resolutionPhotos?.length > 0 && (
                            <div className="mb-4">
                              <h6
                                className={`font-medium mb-3 ${
                                  isDarkMode ? "text-green-200" : "text-green-800"
                                }`}
                              >
                                Resolution Proof Photos (
                                {complaintDetails.resolutionPhotos.length})
                              </h6>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {complaintDetails.resolutionPhotos.map(
                                  (photo, index) => (
                                    <img
                                      key={index}
                                      src={photo.url}
                                      alt={`Resolution photo ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-green-300 dark:border-green-600"
                                    />
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {complaintDetails.resolutionVideos?.length > 0 && (
                            <div>
                              <h6
                                className={`font-medium mb-3 ${
                                  isDarkMode ? "text-green-200" : "text-green-800"
                                }`}
                              >
                                Resolution Videos (
                                {complaintDetails.resolutionVideos.length})
                              </h6>
                              <div className="flex flex-wrap gap-3">
                                {complaintDetails.resolutionVideos.map(
                                  (vid, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-48 flex-shrink-0 border ${
                                        isDarkMode
                                          ? "border-white/10 bg-[#111]"
                                          : "border-gray-200 bg-white"
                                      }`}
                                    >
                                      <VideoPlayer
                                        src={vid.url}
                                        className="w-full"
                                      />
                                      {vid.originalName && (
                                        <p
                                          className={`px-2 py-1.5 text-xs truncate border-t ${
                                            isDarkMode
                                              ? "border-white/10 text-gray-400"
                                              : "border-gray-200 text-gray-500"
                                          }`}
                                        >
                                          {vid.originalName}
                                        </p>
                                      )}
                                    </div>
                                  ),
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

            {/* Existing photos */}
            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className={`text-xs mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Current Photos</p>
                <div className="grid grid-cols-3 gap-3">
                  {existingPhotos.map((photo) => (
                    <div key={photo.publicId} className="relative">
                      <img
                        src={photo.url}
                        alt="existing"
                        className={`w-full h-24 object-cover rounded-lg border ${
                          removedPhotoIds.includes(photo.publicId) ? "opacity-40" : ""
                        } ${isDarkMode ? "border-white/10" : "border-gray-200"}`}
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

            {/* New photos preview */}
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

            {/* Upload button */}
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

export default ComplaintManagement;


