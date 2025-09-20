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

  // ...existing photo modal functions...

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
          <h1 className="text-3xl font-bold text-white">My Assignments</h1>
          <p className="text-gray-400 mt-1">View and manage your active complaint assignments</p>
        </div>

        {/* Photo Modal - same as before */}

        {/* Active Assignments List */}
        {assignments.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-xl font-medium text-gray-400 mb-2">
              No active assignments
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
                className="bg-gradient-to-r from-gray-800 to-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
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
                    
                    {/* Rest of the complaint details same as dashboard */}
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
      </div>
    </DashboardLayout>
  );
};

export default TechnicianAssignments;
