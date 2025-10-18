import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench,
  Search,
  UserCheck,
  UserX,
  Trash2,
  Phone,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/axios';

const TechnicianManagement = () => {
  const { isDarkMode } = useTheme();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTechnicians();
  }, [pagination.page, searchTerm]);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/technicians', {
        params: {
          page: pagination.page,
          limit: 10,
          search: searchTerm || undefined
        }
      });
      setTechnicians(response.data.technicians);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, newStatus) => {
    try {
      setActionLoading(userId);
      await api.patch(`/admin/users/${userId}/toggle-status`, {
        isActive: newStatus
      });
      
      setTechnicians(technicians.map(tech => 
        tech._id === userId 
          ? { ...tech, isActive: newStatus }
          : tech
      ));
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setActionLoading(userId);
      await api.delete(`/admin/users/${userId}`);
      
      setTechnicians(technicians.filter(tech => tech._id !== userId));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const createTechnician = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/admin/technicians', formData);
      
      setShowCreateModal(false);
      setFormData({ name: '', phoneNumber: '' });
      fetchTechnicians();
    } catch (error) {
      console.error('Create technician error:', error);
      alert(error.response?.data?.message || 'Failed to create technician');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTechnician = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.put(`/admin/technicians/${selectedTechnician._id}`, formData);
      
      setShowEditModal(false);
      setSelectedTechnician(null);
      setFormData({ name: '', phoneNumber: '' });
      fetchTechnicians();
    } catch (error) {
      console.error('Update technician error:', error);
      alert(error.response?.data?.message || 'Failed to update technician');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (technician) => {
    setSelectedTechnician(technician);
    setFormData({ name: technician.name, phoneNumber: technician.phoneNumber });
    setShowEditModal(true);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading) {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Technician Management
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage all registered technicians
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Wrench className="h-4 w-4" />
            <span>Add Technician</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className={`p-6 rounded-2xl shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search by name or phone number..."
                value={searchTerm}
                onChange={handleSearch}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Technicians List */}
        <div className={`rounded-2xl shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Wrench className={`h-6 w-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                All Technicians ({pagination.total})
              </h2>
            </div>

            {technicians.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className={`h-12 w-12 mx-auto mb-4 ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <p className={`text-lg font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No technicians found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {technicians.map((technician, index) => (
                  <motion.div
                    key={technician._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border ${
                      isDarkMode 
                        ? 'bg-gray-700/50 border-gray-600' 
                        : 'bg-gray-50 border-gray-200'
                    } hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          technician.isActive 
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          <Wrench className="h-6 w-6" />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className={`font-semibold ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {technician.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              technician.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {technician.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2 text-sm">
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Phone className="h-4 w-4" />
                              <span>{technician.phoneNumber}</span>
                            </span>
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Activity className="h-4 w-4" />
                              <span>{technician.activeAssignments} active</span>
                            </span>
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <CheckCircle className="h-4 w-4" />
                              <span>{technician.completedAssignments} completed</span>
                            </span>
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Calendar className="h-4 w-4" />
                              <span>Joined {new Date(technician.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleUserStatus(technician._id, !technician.isActive)}
                          disabled={actionLoading === technician._id}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            technician.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                          }`}
                        >
                          {actionLoading === technician._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <>
                              {technician.isActive ? (
                                <>
                                  <UserX className="h-4 w-4 inline mr-1" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 inline mr-1" />
                                  Enable
                                </>
                              )}
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setShowDeleteModal(technician)}
                          disabled={actionLoading === technician._id || technician.activeAssignments > 0}
                          className="px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={technician.activeAssignments > 0 ? 'Cannot delete technician with active assignments' : ''}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center mt-8 space-x-2">
                {[...Array(pagination.pages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pagination.page === i + 1
                        ? 'bg-primary-600 text-white'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Technician Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-2xl max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Add New Technician
              </h3>
              
              <form onSubmit={createTechnician} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', phoneNumber: '' });
                    }}
                    className={`flex-1 px-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Technician Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-2xl max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Edit Technician
              </h3>
              
              <form onSubmit={updateTechnician} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTechnician(null);
                      setFormData({ name: '', phoneNumber: '' });
                    }}
                    className={`flex-1 px-4 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-2xl max-w-md mx-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Delete Technician
                </h3>
              </div>
              
              <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to delete <strong>{showDeleteModal.name}</strong>? 
                This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(showDeleteModal._id)}
                  disabled={actionLoading === showDeleteModal._id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === showDeleteModal._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TechnicianManagement;
