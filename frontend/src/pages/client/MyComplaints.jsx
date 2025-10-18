import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  X,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  Pause,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/axios';

const MyComplaints = () => {
  const { isDarkMode } = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [editComplaint, setEditComplaint] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter]);

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/client/complaints');
      setComplaints(response.data.complaints);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      toast.error('Failed to load complaints');
    } finally {
      setIsLoading(false);
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(complaint => complaint.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(complaint =>
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.complaintId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredComplaints(filtered);
  };

  const updateComplaint = async (complaintId, updateData, newPhotos = [], removedPhotoIds = []) => {
    try {
      setIsUpdating(true);
      
      // If there are new photos to upload or photos to remove, use FormData
      if (newPhotos.length > 0 || removedPhotoIds.length > 0) {
        const formData = new FormData();
        
        // Append text data
        Object.keys(updateData).forEach(key => {
          formData.append(key, updateData[key]);
        });
        
        // Append new photos
        newPhotos.forEach(photo => {
          formData.append('photos', photo.file);
        });
        
        // Append removed photo IDs
        removedPhotoIds.forEach(id => {
          formData.append('removedPhotos', id);
        });
        
        await api.put(`/client/complaints/${complaintId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // No photo changes, use regular JSON request
        await api.put(`/client/complaints/${complaintId}`, updateData);
      }
      
      toast.success('Complaint updated successfully');
      fetchComplaints();
      setEditComplaint(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update complaint');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteComplaint = async (complaintId) => {
    try {
      await api.delete(`/client/complaints/${complaintId}`);
      toast.success('Complaint deleted successfully');
      fetchComplaints();
      setDeleteConfirmation(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete complaint');
    }
  };

  const downloadImage = (imageUrl, fileName) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'complaint-image.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const ComplaintDetailModal = ({ complaint, onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 p-6 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {complaint.title}
              </h2>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                ID: {complaint.complaintId}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <span className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(complaint.status)}`}>
              {complaint.status.replace('-', ' ').toUpperCase()}
            </span>
            <span className={`text-sm font-medium capitalize ${getPriorityColor(complaint.priority)}`}>
              {complaint.priority} Priority
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Description
            </h3>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {complaint.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Location
                </span>
              </div>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {complaint.location}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Created Date
                </span>
              </div>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {new Date(complaint.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Technician Info */}
          {complaint.assignedTechnician && (
            <div className={`p-4 rounded-lg border ${
              isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Assigned Technician
                </span>
              </div>
              <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {complaint.assignedTechnician.name}
              </p>
              {complaint.assignedAt && (
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  Assigned on: {new Date(complaint.assignedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Complaint Created
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(complaint.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {complaint.assignedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Assigned to Technician
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(complaint.assignedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {complaint.startedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <PlayCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Work Started
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(complaint.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {complaint.completedAt && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Completed
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(complaint.completedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          {complaint.photos && complaint.photos.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Photos ({complaint.photos.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {complaint.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.url}
                      alt={`Complaint photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(photo)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(photo.url, photo.originalName);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technician Notes */}
          {complaint.technicianNotes && (
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Technician Notes
              </h3>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                {complaint.technicianNotes}
              </p>
            </div>
          )}

          {/* Resolution Data - Only show for resolved complaints */}
          {complaint.status === 'resolved' && (complaint.resolutionNotes || (complaint.resolutionPhotos && complaint.resolutionPhotos.length > 0)) && (
            <div className={`p-4 rounded-lg border ${
              isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
                isDarkMode ? 'text-green-300' : 'text-green-700'
              }`}>
                <CheckCircle className="h-5 w-5" />
                <span>Resolution Details</span>
              </h3>
              
              {complaint.resolutionNotes && (
                <div className="mb-4">
                  <h4 className={`font-medium mb-2 ${
                    isDarkMode ? 'text-green-200' : 'text-green-800'
                  }`}>
                    Resolution Notes
                  </h4>
                  <p className={`leading-relaxed ${
                    isDarkMode ? 'text-green-100' : 'text-green-700'
                  }`}>
                    {complaint.resolutionNotes}
                  </p>
                </div>
              )}

              {complaint.resolvedAt && (
                <div className="mb-4">
                  <p className={`text-sm ${
                    isDarkMode ? 'text-green-300' : 'text-green-600'
                  }`}>
                    <strong>Completed on:</strong> {new Date(complaint.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {complaint.resolutionPhotos && complaint.resolutionPhotos.length > 0 && (
                <div>
                  <h4 className={`font-medium mb-3 ${
                    isDarkMode ? 'text-green-200' : 'text-green-800'
                  }`}>
                    Resolution Proof Photos ({complaint.resolutionPhotos.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {complaint.resolutionPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.url}
                          alt={`Resolution photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-green-200 dark:border-green-600"
                          onClick={() => setSelectedImage(photo)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(photo.url, photo.originalName || `resolution-photo-${index + 1}.jpg`);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {complaint.status === 'pending' && (
          <div className={`sticky bottom-0 p-6 border-t ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex space-x-3">
              <Link
                to={`/client/complaints/${complaint._id}/edit`}
                className="flex-1 bg-yellow-500 text-white py-3 px-4 rounded-xl font-semibold text-center hover:bg-yellow-600 transition-colors"
              >
                Edit Complaint
              </Link>
              <button
                onClick={() => {
                  setDeleteConfirmation(complaint);
                  onClose();
                }}
                className="flex-1 bg-red-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                Delete Complaint
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  const DeleteConfirmationModal = ({ complaint, onConfirm, onCancel }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-md rounded-2xl shadow-2xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className={`text-xl font-bold text-center mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Delete Complaint
          </h3>
          
          <p className={`text-center mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Are you sure you want to delete "{complaint.title}"? This action cannot be undone.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(complaint._id)}
              className="flex-1 bg-red-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  const EditComplaintModal = ({ complaint, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
      title: complaint.title,
      description: complaint.description,
      location: complaint.location,
      priority: complaint.priority
    });
    
    const [existingPhotos, setExistingPhotos] = useState(complaint.photos || []);
    const [newPhotos, setNewPhotos] = useState([]);
    const [removedPhotoIds, setRemovedPhotoIds] = useState([]);

    const onDrop = useCallback((acceptedFiles) => {
      const totalPhotos = existingPhotos.length + newPhotos.length + acceptedFiles.length - removedPhotoIds.length;
      
      if (totalPhotos > 5) {
        toast.error('Maximum 5 photos allowed');
        return;
      }

      const newPhotoObjects = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9),
        isNew: true
      }));

      setNewPhotos(prev => [...prev, ...newPhotoObjects]);
    }, [existingPhotos.length, newPhotos.length, removedPhotoIds.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: {
        'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
      },
      maxSize: 5 * 1024 * 1024, // 5MB
      multiple: true
    });

    const removeExistingPhoto = (photoId) => {
      setRemovedPhotoIds(prev => [...prev, photoId]);
    };

    const restoreExistingPhoto = (photoId) => {
      setRemovedPhotoIds(prev => prev.filter(id => id !== photoId));
    };

    const removeNewPhoto = (photoId) => {
      setNewPhotos(prev => {
        const updated = prev.filter(photo => photo.id !== photoId);
        // Revoke object URL to prevent memory leaks
        const photoToRemove = prev.find(photo => photo.id === photoId);
        if (photoToRemove) {
          URL.revokeObjectURL(photoToRemove.preview);
        }
        return updated;
      });
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onUpdate(complaint._id, formData, newPhotos, removedPhotoIds);
    };

    const handleChange = (e) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    };

    // Clean up object URLs when component unmounts
    useEffect(() => {
      return () => {
        newPhotos.forEach(photo => {
          if (photo.preview) {
            URL.revokeObjectURL(photo.preview);
          }
        });
      };
    }, []);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`sticky top-0 p-6 border-b ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex justify-between items-center">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Edit Complaint
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className={`h-6 w-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                }`}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 resize-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                }`}
              />
            </div>

            {/* Location */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                }`}
              />
            </div>

            {/* Priority */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Photos Section */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Photos (Max 5)
              </label>

              {/* Existing Photos */}
              {existingPhotos.length > 0 && (
                <div className="mb-4">
                  <h4 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Current Photos
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {existingPhotos.map((photo) => (
                      <div key={photo.publicId} className="relative group">
                        <div className={`relative ${
                          removedPhotoIds.includes(photo.publicId) ? 'opacity-50' : ''
                        }`}>
                          <img
                            src={photo.url}
                            alt="Existing photo"
                            className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                          />
                          {removedPhotoIds.includes(photo.publicId) && (
                            <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                              <span className="text-red-600 font-medium text-xs">REMOVED</span>
                            </div>
                          )}
                        </div>
                        
                        {removedPhotoIds.includes(photo.publicId) ? (
                          <button
                            type="button"
                            onClick={() => restoreExistingPhoto(photo.publicId)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(photo.publicId)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Photos */}
              {newPhotos.length > 0 && (
                <div className="mb-4">
                  <h4 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    New Photos
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {newPhotos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.preview}
                          alt="New photo preview"
                          className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(photo.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Area */}
              {(existingPhotos.length + newPhotos.length - removedPhotoIds.length) < 5 && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : isDarkMode
                      ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`h-6 w-6 mx-auto mb-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {isDragActive ? 'Drop the files here...' : 'Add more photos'}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    PNG, JPG, GIF up to 5MB each
                  </p>
                </div>
              )}

              {(existingPhotos.length + newPhotos.length - removedPhotoIds.length) >= 5 && (
                <div className={`text-center p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Maximum photo limit reached (5/5)
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isUpdating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Update Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              My Complaints
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage and track your submitted complaints
            </p>
          </div>
          
          <Link to="/client/create-complaint">
            <motion.button
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-primary-700 hover:to-primary-800 shadow-lg w-full sm:w-auto justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>New Complaint</span>
            </motion.button>
          </Link>
        </div>

        {/* Filters */}
        <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                  }`}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
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
          </div>
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {filteredComplaints.length === 0 ? (
            <div className={`text-center py-8 sm:py-12 rounded-2xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <p className={`text-base sm:text-lg font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {searchTerm || statusFilter !== 'all' ? 'No complaints match your filters' : 'No complaints yet'}
              </p>
              <p className={`mt-2 text-sm sm:text-base ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first complaint to get started'}
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
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                } hover:shadow-xl transition-all duration-200`}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className={`text-lg sm:text-xl font-semibold truncate ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {complaint.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`text-xs sm:text-sm font-medium capitalize whitespace-nowrap ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority} Priority
                        </span>
                      </div>
                    </div>
                    
                    <p className={`mb-3 text-sm sm:text-base line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {complaint.description}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm">
                      <span className={`flex items-center space-x-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{complaint.location}</span>
                      </span>
                      <span className={`flex items-center space-x-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} whitespace-nowrap`}>
                        ID: {complaint.complaintId}
                      </span>
                    </div>

                    {/* Photos */}
                    {complaint.photos && complaint.photos.length > 0 && (
                      <div className="mt-4">
                        <p className={`text-xs sm:text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Photos ({complaint.photos.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {complaint.photos.slice(0, 4).map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo.url}
                                alt={`Complaint photo ${index + 1}`}
                                className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage(photo)}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(photo.url, photo.originalName);
                                }}
                                className="absolute top-0.5 right-0.5 w-4 h-4 sm:w-6 sm:h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                              </button>
                            </div>
                          ))}
                          {complaint.photos.length > 4 && (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                              +{complaint.photos.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technician Info */}
                    {complaint.assignedTechnician && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                          <span className="font-medium">Assigned to:</span> {complaint.assignedTechnician.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col items-center gap-2 lg:ml-4 justify-end lg:justify-start">
                    <button
                      onClick={() => setSelectedComplaint(complaint)}
                      className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    
                    {complaint.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setEditComplaint(complaint)}
                          className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(complaint)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Modals */}
        <AnimatePresence>
          {selectedComplaint && (
            <ComplaintDetailModal
              complaint={selectedComplaint}
              onClose={() => setSelectedComplaint(null)}
            />
          )}

          {editComplaint && (
            <EditComplaintModal
              complaint={editComplaint}
              onClose={() => setEditComplaint(null)}
              onUpdate={updateComplaint}
            />
          )}

          {deleteConfirmation && (
            <DeleteConfirmationModal
              complaint={deleteConfirmation}
              onConfirm={deleteComplaint}
              onCancel={() => setDeleteConfirmation(null)}
            />
          )}

          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-4xl max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedImage.url}
                  alt="Full size"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                <button
                  onClick={() => downloadImage(selectedImage.url, selectedImage.originalName)}
                  className="absolute top-4 right-20 w-12 h-12 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
                >
                  <Download className="h-6 w-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default MyComplaints;
