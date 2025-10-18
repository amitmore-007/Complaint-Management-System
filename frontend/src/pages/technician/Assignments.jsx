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
  Eye,
  Camera
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
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolutionData, setResolutionData] = useState({
    notes: '',
    photos: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);

      const response = await api.get('/technician/assignments');
      
      if (response.data.success) {
        const data = response.data.data || {};
        const complaints = data.complaints || [];
        
        // Filter only active assignments (assigned and in-progress)
        const activeAssignments = complaints.filter(complaint => 
          complaint.status === 'assigned' || complaint.status === 'in-progress'
        );
      
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

  const updateComplaintStatus = async (complaintId, newStatus, notes = '', resolutionData = null) => {
    try {
     
      
      const formData = new FormData();
      
      // Ensure status is properly appended
      formData.append('status', newStatus);
   
      
      if (notes) {
        formData.append('notes', notes);
      }
      
      if (resolutionData) {
        if (resolutionData.notes) {
          formData.append('resolutionNotes', resolutionData.notes);
        }
        if (resolutionData.photos && resolutionData.photos.length > 0) {
          resolutionData.photos.forEach((photo, index) => {
            formData.append('resolutionPhotos', photo);
          });
        }
      }

      // Debug: Log all FormData entries
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      const response = await api.patch(`/technician/assignments/${complaintId}/status`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(`Complaint ${newStatus === 'in-progress' ? 'started' : 'completed'} successfully!`);
      fetchAssignments();
    } catch (error) {
      console.error('❌ Update status error:', error);
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

  const openResolutionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setShowResolutionModal(true);
    setResolutionData({ notes: '', photos: [] });
  };

  const closeResolutionModal = () => {
    setShowResolutionModal(false);
    setSelectedComplaint(null);
    setResolutionData({ notes: '', photos: [] });
  };

  const handleResolutionSubmit = async () => {
    if (!selectedComplaint) return;
    
    setIsSubmitting(true);
    try {
      await updateComplaintStatus(selectedComplaint._id, 'resolved', '', resolutionData);
      closeResolutionModal();
    } catch (error) {
      console.error('Resolution submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + resolutionData.photos.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setResolutionData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  const removePhoto = (index) => {
    setResolutionData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
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

        {/* Resolution Modal */}
        {showResolutionModal && selectedComplaint && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Mark Complaint as Resolved
                  </h3>
                  <button
                    onClick={closeResolutionModal}
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className={`font-medium mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedComplaint.title}
                    </h4>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      ID: {selectedComplaint.complaintId}
                    </p>
                  </div>

                  {/* Resolution Notes */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Resolution Notes *
                    </label>
                    <textarea
                      value={resolutionData.notes}
                      onChange={(e) => setResolutionData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      placeholder="Describe how the complaint was resolved..."
                      className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      required
                    />
                  </div>

                  {/* Resolution Photos */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Resolution Proof Photos (Optional)
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center ${
                      isDarkMode 
                        ? 'border-gray-600 hover:border-gray-500' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
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
                        <Camera className={`h-8 w-8 mx-auto mb-2 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Click to add photos showing the resolved work
                        </p>
                        <p className={`text-xs mt-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
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
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleResolutionSubmit}
                      disabled={!resolutionData.notes.trim() || isSubmitting}
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

export default TechnicianAssignments;
