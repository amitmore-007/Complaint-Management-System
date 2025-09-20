import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Clock, 
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

const TechnicianAssignments = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState([]);
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
      console.log('🔄 Fetching active assignments...');
      
      const response = await api.get('/technician/assignments');
      
      if (response.data.success) {
        const data = response.data.data || {};
        const complaints = data.complaints || [];
        
        // Filter only active assignments (assigned and in-progress)
        const activeAssignments = complaints.filter(complaint => 
          complaint.status === 'assigned' || complaint.status === 'in-progress'
        );
        
        console.log('📋 Active assignments:', activeAssignments);
        setAssignments(activeAssignments);
      } else {
        throw new Error(response.data.message || 'Failed to fetch assignments');
      }
    } catch (error) {
      console.error('❌ Failed to fetch assignments:', error);
      toast.error(error.response?.data?.message || 'Failed to load assignments');
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateComplaintStatus = async (complaintId, newStatus, notes = '') => {
    try {
      await api.patch(`/technician/assignments/${complaintId}/status`, {
        status: newStatus,
        notes
      });

      toast.success(`Complaint ${newStatus === 'in-progress' ? 'started' : 'completed'} successfully!`);
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
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
      const newIndex = direction === 'next' ? prevIndex + 1 : prevIndex - 1;
      return Math.min(Math.max(newIndex, 0), currentComplaintPhotos.length - 1);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'in-progress': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
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
        {/* Header */}
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Assignments</h1>
          <p className={`mt-1 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>View and manage your active complaint assignments</p>
        </div>

        {/* Active Assignments List */}
        {assignments.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <ClipboardList className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg sm:text-xl font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No active assignments
            </p>
            <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              New assignments will appear here when they are assigned to you
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((complaint) => (
              <motion.div
                key={complaint._id}
                className={`border rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-gray-800 to-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-blue-500/5'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <h3 className={`text-lg sm:text-xl font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {complaint.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`text-xs sm:text-sm font-semibold capitalize whitespace-nowrap ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority} Priority
                        </span>
                      </div>
                    </div>
                    
                    <p className={`mb-4 text-sm sm:text-base line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {complaint.description}
                    </p>
                    
                    {/* Rest of complaint details with theme-aware colors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-4">
                      <div className="space-y-2">
                        <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate"><strong>Client:</strong> {complaint.client?.name}</span>
                        </div>
                        <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate"><strong>Location:</strong> {complaint.location}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap"><strong>Assigned:</strong> {new Date(complaint.assignedAt).toLocaleDateString()}</span>
                        </div>
                        <div className={`whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <strong>ID:</strong> {complaint.complaintId}
                        </div>
                      </div>
                    </div>

                    {/* Photos section with theme colors */}
                    {complaint.photos && Array.isArray(complaint.photos) && complaint.photos.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-xs sm:text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Photos ({complaint.photos.length})
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {complaint.photos.slice(0, 4).map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo.url}
                                alt={`Complaint photo ${index + 1}`}
                                className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border ${
                                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                }`}
                                onClick={() => openPhotoModal(complaint.photos, index)}
                              />
                              <div className="absolute inset-0 rounded-lg transition-opacity bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2">
                                <span className="text-white text-xs sm:text-sm font-medium">
                                  View Photo
                                </span>
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ))}
                          {complaint.photos.length > 4 && (
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                              isDarkMode 
                                ? 'border-gray-600 text-gray-400 hover:bg-gray-700/50'
                                : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                            }`}>
                              +{complaint.photos.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - keep existing styling as they already use proper colors */}
                  <div className="flex lg:flex-col gap-2 lg:ml-4 justify-end lg:justify-start">
                    {complaint.status === 'assigned' && (
                      <motion.button
                        onClick={() => updateComplaintStatus(complaint._id, 'in-progress')}
                        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 flex items-center space-x-2 font-medium text-sm whitespace-nowrap"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Start Work</span>
                      </motion.button>
                    )}
                    
                    {complaint.status === 'in-progress' && (
                      <motion.button
                        onClick={() => updateComplaintStatus(complaint._id, 'resolved')}
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
      </div>
    </DashboardLayout>
  );
};

export default TechnicianAssignments;
