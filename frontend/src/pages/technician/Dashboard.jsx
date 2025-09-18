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
      const response = await api.get('/technician/assignments');
      
      console.log('📊 Assignments response:', response.data);
      
      // Handle both possible response structures
      const data = response.data.data || response.data;
      const complaints = Array.isArray(data) ? data : (data.complaints || []);
      const statsData = data.stats || {};
      
      setAssignments(complaints);
      
      // Calculate stats if not provided
      if (!statsData.total) {
        const calculatedStats = {
          total: complaints.length,
          assigned: complaints.filter(c => c.status === 'assigned').length,
          inProgress: complaints.filter(c => c.status === 'in-progress').length,
          completed: complaints.filter(c => c.status === 'resolved' || c.status === 'completed').length
        };
        setStats(calculatedStats);
      } else {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error('Failed to load assignments');
      // Set empty state on error
      setAssignments([]);
      setStats({ total: 0, assigned: 0, inProgress: 0, completed: 0 });
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

  const openPhotoModal = (photos, index) => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      toast.error('No photos available');
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
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      toast.error('No photos to download');
      return;
    }

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
      bgColor: 'from-blue-600 to-blue-700'
    },
    {
      title: 'Assigned',
      value: stats.assigned,
      icon: Clock,
      color: 'blue',
      bgColor: 'from-cyan-500 to-cyan-600'
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
      bgColor: 'from-emerald-500 to-emerald-600'
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
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-400 text-lg">
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
              className="group relative p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative flex items-center justify-between">
                <div>
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
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </motion.div>
          ))}
        </div>

        {/* Photo Modal */}
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
                  {currentPhotoIndex + 1} of {currentComplaintPhotos?.length || 0}
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

        {/* Active Assignments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            Active Assignments
          </h2>

          {assignments.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <p className="text-xl font-medium text-gray-400 mb-2">
                No assignments yet
              </p>
              <p className="text-gray-500">
                New assignments will appear here when they are assigned to you
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className="group bg-gradient-to-r from-gray-800 to-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-bold text-white">
                          {complaint.title}
                        </h3>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`text-sm font-semibold capitalize ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority} Priority
                        </span>
                      </div>
                      
                      <p className="text-gray-300 mb-4">
                        {complaint.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <User className="h-4 w-4" />
                            <span><strong>Client:</strong> {complaint.client?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span><strong>Location:</strong> {complaint.location}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span><strong>Assigned:</strong> {new Date(complaint.assignedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-gray-400">
                            <strong>ID:</strong> {complaint.complaintId}
                          </div>
                        </div>
                      </div>

                      {/* Photos */}
                      {complaint.photos && Array.isArray(complaint.photos) && complaint.photos.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-300">
                              Photos ({complaint.photos.length})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {complaint.photos.slice(0, 6).map((photo, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={photo.url}
                                  alt={`Complaint photo ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-gray-600"
                                  onClick={() => openPhotoModal(complaint.photos, index)}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPhotoModal(complaint.photos, index);
                                      }}
                                      className="p-1 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                    >
                                      <Eye className="h-3 w-3 text-white" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadPhoto(photo.url, `complaint-${complaint.complaintId}-photo-${index + 1}.jpg`);
                                      }}
                                      className="p-1 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
                                    >
                                      <Download className="h-3 w-3 text-white" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {complaint.photos.length > 6 && (
                              <div 
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-xs font-medium text-gray-400 cursor-pointer hover:bg-gray-700/50 transition-all"
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
                        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                          <p className="text-sm text-blue-300">
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
                          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 flex items-center space-x-2 font-medium"
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
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 flex items-center space-x-2 font-medium"
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
