import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const TechnicianDashboard = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/technician/complaints/assigned');
      const complaints = response.data.complaints;
      
      setAssignments(complaints);
      
      // Calculate stats
      const statsData = {
        total: complaints.length,
        assigned: complaints.filter(c => c.status === 'assigned').length,
        inProgress: complaints.filter(c => c.status === 'in-progress').length,
        completed: complaints.filter(c => c.status === 'resolved').length
      };
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const updateComplaintStatus = async (complaintId, newStatus, notes = '') => {
    try {
      await api.patch(`/technician/complaints/${complaintId}/status`, {
        status: newStatus,
        notes
      });

      toast.success(`Complaint ${newStatus === 'in-progress' ? 'started' : 'completed'} successfully!`);
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
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
      toast.success('Photo downloaded successfully!');
    } catch (error) {
      console.error('Failed to download photo:', error);
      toast.error('Failed to download photo');
    }
  };

  const downloadAllPhotos = async (photos, complaintId) => {
    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileName = `complaint-${complaintId}-photo-${i + 1}.jpg`;
        await downloadPhoto(photo.url, fileName);
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to download photos:', error);
      toast.error('Failed to download all photos');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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
      title: 'Total Assignments',
      value: stats.total,
      icon: ClipboardList,
      color: 'primary',
      bgColor: 'from-primary-500 to-primary-600'
    },
    {
      title: 'Assigned',
      value: stats.assigned,
      icon: Clock,
      color: 'blue',
      bgColor: 'from-blue-500 to-blue-600'
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'from-green-500 to-green-600'
    }
  ];

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
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome back, {user?.name}!
          </h1>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Here are your current assignments and tasks.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 rounded-2xl shadow-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${card.bgColor} rounded-xl flex items-center justify-center`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Photo Modal */}
        {photoModalOpen && selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closePhotoModal}
          >
            <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={closePhotoModal}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>

              {/* Photo */}
              <img
                src={selectedPhoto.url}
                alt="Complaint photo"
                className="max-w-full max-h-full object-contain rounded-lg"
              />

              {/* Navigation Arrows */}
              {currentComplaintPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => navigatePhoto('prev')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button
                    onClick={() => navigatePhoto('next')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}

              {/* Photo Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <span className="text-white text-sm">
                  {currentPhotoIndex + 1} of {currentComplaintPhotos.length}
                </span>
                <button
                  onClick={() => downloadPhoto(selectedPhoto.url, `complaint-photo-${currentPhotoIndex + 1}.jpg`)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Assignments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-6 rounded-2xl shadow-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <h2 className={`text-xl font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Active Assignments
          </h2>

          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className={`h-12 w-12 mx-auto mb-4 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`text-lg font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No assignments yet
              </p>
              <p className={`mt-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                New assignments will appear here when they are assigned to you
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className={`p-6 rounded-xl border ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  } hover:shadow-md transition-all duration-200`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className={`text-xl font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {complaint.title}
                        </h3>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`text-sm font-medium capitalize ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority} Priority
                        </span>
                      </div>
                      
                      <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {complaint.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="space-y-2">
                          <div className={`flex items-center space-x-2 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <User className="h-4 w-4" />
                            <span><strong>Client:</strong> {complaint.client?.name}</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <MapPin className="h-4 w-4" />
                            <span><strong>Location:</strong> {complaint.location}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className={`flex items-center space-x-2 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <Calendar className="h-4 w-4" />
                            <span><strong>Assigned:</strong> {new Date(complaint.assignedAt).toLocaleDateString()}</span>
                          </div>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            <strong>ID:</strong> {complaint.complaintId}
                          </div>
                        </div>
                      </div>

                      {/* Photos */}
                      {complaint.photos && complaint.photos.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className={`text-sm font-medium ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Photos ({complaint.photos.length})
                            </p>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => downloadAllPhotos(complaint.photos, complaint.complaintId)}
                                className="text-xs px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-1"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download All</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {complaint.photos.slice(0, 6).map((photo, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photo.url}
                                  alt={`Complaint photo ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => openPhotoModal(complaint.photos, index)}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPhotoModal(complaint.photos, index);
                                      }}
                                      className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                                    >
                                      <Eye className="h-3 w-3 text-gray-700" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadPhoto(photo.url, `complaint-${complaint.complaintId}-photo-${index + 1}.jpg`);
                                      }}
                                      className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-all"
                                    >
                                      <Download className="h-3 w-3 text-gray-700" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {complaint.photos.length > 6 && (
                              <div 
                                className={`w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-xs font-medium cursor-pointer hover:bg-opacity-50 transition-all ${
                                  isDarkMode 
                                    ? 'border-gray-600 text-gray-400 hover:bg-gray-600' 
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                                }`}
                                onClick={() => openPhotoModal(complaint.photos, 6)}
                              >
                                +{complaint.photos.length - 6}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Technician Notes */}
                      {complaint.technicianNotes && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                            <strong>Notes:</strong> {complaint.technicianNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {complaint.status === 'assigned' && (
                        <motion.button
                          onClick={() => updateComplaintStatus(complaint._id, 'in-progress')}
                          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 flex items-center space-x-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Play className="h-4 w-4" />
                          <span>Start Work</span>
                        </motion.button>
                      )}
                      
                      {complaint.status === 'in-progress' && (
                        <motion.button
                          onClick={() => updateComplaintStatus(complaint._id, 'resolved')}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center space-x-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <CheckSquare className="h-4 w-4" />
                          <span>Mark Complete</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default TechnicianDashboard;
