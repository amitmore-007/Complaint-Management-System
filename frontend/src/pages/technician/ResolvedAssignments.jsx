import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const ResolvedAssignments = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [resolvedComplaints, setResolvedComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentComplaintPhotos, setCurrentComplaintPhotos] = useState([]);

  useEffect(() => {
    fetchResolvedAssignments();
  }, []);

  const fetchResolvedAssignments = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching resolved assignments...');
      
      const response = await api.get('/technician/resolved-assignments');
      
      console.log('📊 Resolved assignments response:', response.data);
      
      if (response.data.success) {
        const data = response.data.data || {};
        const complaints = data.complaints || [];
        
        console.log('✅ Resolved complaints:', complaints);
        setResolvedComplaints(complaints);
      } else {
        throw new Error(response.data.message || 'Failed to fetch resolved assignments');
      }
    } catch (error) {
      console.error('❌ Failed to fetch resolved assignments:', error);
      toast.error(error.response?.data?.message || 'Failed to load resolved assignments');
      setResolvedComplaints([]);
    } finally {
      setIsLoading(false);
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
          <h1 className="text-3xl font-bold text-white">My Resolved Assignments</h1>
          <p className="text-gray-400 mt-1">View all complaints you have successfully resolved</p>
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

        {/* Resolved Complaints List */}
        {resolvedComplaints.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-xl font-medium text-gray-400 mb-2">
              No resolved assignments yet
            </p>
            <p className="text-gray-500">
              Complaints you resolve will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {resolvedComplaints.map((complaint) => (
              <motion.div
                key={complaint._id}
                className="bg-gradient-to-r from-gray-800 to-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-bold text-white">
                        {complaint.title}
                      </h3>
                      <span className="px-3 py-1 text-sm font-semibold rounded-full text-green-600 bg-green-100 dark:bg-green-900/30">
                        RESOLVED
                      </span>
                      <span className="text-sm font-semibold capitalize text-gray-400">
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
                          <span><strong>Resolved:</strong> {new Date(complaint.updatedAt).toLocaleDateString()}</span>
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
                      <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                        <p className="text-sm text-green-300">
                          <strong>Resolution Notes:</strong> {complaint.technicianNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="ml-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-6 w-6 text-white" />
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

