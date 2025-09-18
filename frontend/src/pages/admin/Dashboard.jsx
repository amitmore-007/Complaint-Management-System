import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
    totalClients: 0,
    totalTechnicians: 0,
    activeTechnicians: 0,
    recentComplaints: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/dashboard/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openDetailsModal = async (complaint) => {
    try {
      const response = await api.get(`/admin/complaints/${complaint._id}`);
      setSelectedComplaint(response.data.complaint);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to fetch complaint details:', error);
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
    const newIndex = direction === 'next' 
      ? (currentPhotoIndex + 1) % currentComplaintPhotos.length
      : (currentPhotoIndex - 1 + currentComplaintPhotos.length) % currentComplaintPhotos.length;
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(currentComplaintPhotos[newIndex]);
  };

  const downloadPhoto = async (photoUrl, fileName) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'complaint-photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download photo:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'assigned': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'in-progress': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'resolved': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const statsCards = [
    {
      title: 'Total Complaints',
      value: stats.totalComplaints,
      icon: FileText,
      color: 'primary',
      bgColor: 'from-blue-600 to-blue-700',
      link: '/admin/complaints'
    },
    {
      title: 'Pending',
      value: stats.pendingComplaints,
      icon: Clock,
      color: 'yellow',
      bgColor: 'from-amber-500 to-amber-600',
      link: '/admin/complaints?status=pending'
    },
    {
      title: 'In Progress',
      value: stats.inProgressComplaints,
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'from-orange-500 to-orange-600',
      link: '/admin/complaints?status=in-progress'
    },
    {
      title: 'Resolved',
      value: stats.resolvedComplaints,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'from-emerald-500 to-emerald-600',
      link: '/admin/complaints?status=resolved'
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'blue',
      bgColor: 'from-cyan-500 to-cyan-600',
      link: '/admin/clients'
    },
    {
      title: 'Active Technicians',
      value: `${stats.activeTechnicians}/${stats.totalTechnicians}`,
      icon: Wrench,
      color: 'purple',
      bgColor: 'from-purple-500 to-purple-600',
      link: '/admin/technicians'
    }
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 text-lg">
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
                <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden">
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm font-medium mb-1">
                        {card.title}
                      </p>
                      <p className="text-white text-3xl font-bold">
                        {card.value}
                      </p>
                    </div>
                    <div className={`w-14 h-14 bg-gradient-to-r ${card.bgColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <card.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
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
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              Recent Complaints
            </h2>
            <Link 
              to="/admin/complaints"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              View All
            </Link>
          </div>

          {stats.recentComplaints.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <p className="text-xl font-medium text-gray-400 mb-2">
                No complaints yet
              </p>
              <p className="text-gray-500">
                Complaints will appear here as they are submitted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentComplaints.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className="group bg-gradient-to-r from-gray-800 to-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="font-bold text-white text-lg">
                          {complaint.title}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`text-sm font-semibold capitalize ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 mb-4 line-clamp-2">
                        {complaint.description}
                      </p>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <span className="flex items-center space-x-2 text-gray-400">
                          <Users className="h-4 w-4" />
                          <span>{complaint.client?.name}</span>
                        </span>
                        <span className="flex items-center space-x-2 text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{complaint.location}</span>
                        </span>
                        <span className="flex items-center space-x-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className="text-gray-500">
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
                      className="ml-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium"
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
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              onClick={closePhotoModal}
            >
              <div className="relative max-w-6xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
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
                      onClick={() => navigatePhoto('prev')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </button>
                    <button
                      onClick={() => navigatePhoto('next')}
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
                    onClick={() => downloadPhoto(selectedPhoto.url, `complaint-photo-${currentPhotoIndex + 1}.jpg`)}
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={closeDetailsModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 p-6 border-b border-gray-700 bg-gray-900/90 backdrop-blur-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {selectedComplaint.title}
                      </h2>
                      <p className="text-gray-400">
                        ID: {selectedComplaint.complaintId}
                      </p>
                    </div>
                    <button
                      onClick={closeDetailsModal}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Status and Priority */}
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status.replace('-', ' ').toUpperCase()}
                    </span>
                    <span className={`text-sm font-semibold capitalize ${getPriorityColor(selectedComplaint.priority)}`}>
                      {selectedComplaint.priority} Priority
                    </span>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3">Client Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{selectedComplaint.client?.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{selectedComplaint.client?.phoneNumber}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3">Complaint Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-300">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{selectedComplaint.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technician Info */}
                  {selectedComplaint.assignedTechnician && (
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-300 mb-3">Assigned Technician</h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-blue-200">
                          <strong>Name:</strong> {selectedComplaint.assignedTechnician.name}
                        </p>
                        <p className="text-blue-200">
                          <strong>Phone:</strong> {selectedComplaint.assignedTechnician.phoneNumber}
                        </p>
                        <p className="text-blue-200">
                          <strong>Assigned:</strong> {new Date(selectedComplaint.assignedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {selectedComplaint.photos && selectedComplaint.photos.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-4">
                        Photos ({selectedComplaint.photos.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {selectedComplaint.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo.url}
                              alt={`Complaint photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openPhotoModal(selectedComplaint.photos, index)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPhotoModal(selectedComplaint.photos, index);
                                  }}
                                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                >
                                  <Eye className="h-4 w-4 text-white" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadPhoto(photo.url, `complaint-${selectedComplaint.complaintId}-photo-${index + 1}.jpg`);
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
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2">Technician Notes</h4>
                      <p className="text-gray-300">
                        {selectedComplaint.technicianNotes}
                      </p>
                    </div>
                  )}
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
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <h2 className={`text-xl font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/complaints?status=pending"
              className={`p-4 rounded-xl border-2 border-dashed border-yellow-300 dark:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-200 text-center`}
            >
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className={`font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                Review Pending Complaints
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {stats.pendingComplaints} waiting for assignment
              </p>
            </Link>
            
            <Link
              to="/admin/technicians"
              className={`p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 text-center`}
            >
              <Wrench className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                Manage Technicians
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {stats.activeTechnicians} active technicians
              </p>
            </Link>
            
            <Link
              to="/admin/clients"
              className={`p-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-center`}
            >
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                Manage Clients
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
