import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Trash2,
  Phone,
  Calendar,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/axios';

const ClientManagement = () => {
  const { isDarkMode } = useTheme();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [pagination.page, searchTerm]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/clients', {
        params: {
          page: pagination.page,
          limit: 10,
          search: searchTerm || undefined
        }
      });
      setClients(response.data.clients);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
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
      
      setClients(clients.map(client => 
        client._id === userId 
          ? { ...client, isActive: newStatus }
          : client
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
      
      setClients(clients.filter(client => client._id !== userId));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const createClient = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Normalize phone number - remove any non-digits and ensure it's 10 digits
      let normalizedPhone = formData.phoneNumber.replace(/\D/g, '');
      
      if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        normalizedPhone = normalizedPhone.substring(2);
      }
      
      if (normalizedPhone.length !== 10) {
        alert('Please enter a valid 10-digit phone number');
        return;
      }

      await api.post('/admin/clients', {
        name: formData.name,
        phoneNumber: normalizedPhone
      });
      
      setShowCreateModal(false);
      setFormData({ name: '', phoneNumber: '' });
      fetchClients();
    } catch (error) {
      console.error('Create client error:', error);
      alert(error.response?.data?.message || 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateClient = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Normalize phone number
      let normalizedPhone = formData.phoneNumber.replace(/\D/g, '');
      
      if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        normalizedPhone = normalizedPhone.substring(2);
      }
      
      if (normalizedPhone.length !== 10) {
        alert('Please enter a valid 10-digit phone number');
        return;
      }

      await api.put(`/admin/clients/${selectedClient._id}`, {
        name: formData.name,
        phoneNumber: normalizedPhone
      });
      
      setShowEditModal(false);
      setSelectedClient(null);
      setFormData({ name: '', phoneNumber: '' });
      fetchClients();
    } catch (error) {
      console.error('Update client error:', error);
      alert(error.response?.data?.message || 'Failed to update client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setFormData({ name: client.name, phoneNumber: client.phoneNumber });
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
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Client Management
            </h1>
            <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage all registered clients
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Add Client</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className={`p-4 sm:p-6 rounded-2xl shadow-lg border ${
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
                className={`w-full pl-10 pr-4 py-2 sm:py-3 rounded-xl border focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className={`rounded-2xl shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <Users className={`h-5 w-5 sm:h-6 sm:w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h2 className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                All Clients ({pagination.total})
              </h2>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Users className={`h-12 w-12 sm:h-12 sm:w-12 mx-auto mb-4 ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <p className={`text-base sm:text-lg font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  No clients found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {clients.map((client, index) => (
                  <motion.div
                    key={client._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 sm:p-4 rounded-xl border ${
                      isDarkMode 
                        ? 'bg-gray-700/50 border-gray-600' 
                        : 'bg-gray-50 border-gray-200'
                    } hover:shadow-md transition-all duration-200`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          client.isActive 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <h3 className={`font-semibold text-sm sm:text-base truncate ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {client.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                              client.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {client.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm">
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{client.phoneNumber}</span>
                            </span>
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{client.complaintCount} complaints</span>
                            </span>
                            <span className={`flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>Joined {new Date(client.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        <button
                          onClick={() => toggleUserStatus(client._id, !client.isActive)}
                          disabled={actionLoading === client._id}
                          className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            client.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                          }`}
                        >
                          {actionLoading === client._id ? (
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-current"></div>
                          ) : (
                            <>
                              {client.isActive ? (
                                <>
                                  <UserX className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                                  <span className="hidden sm:inline">Disable</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                                  <span className="hidden sm:inline">Enable</span>
                                </>
                              )}
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setShowDeleteModal(client)}
                          disabled={actionLoading === client._id}
                          className="px-2 sm:px-3 py-1 sm:py-2 bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(client)}
                          className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                          Edit
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

        {/* Create Client Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-2xl max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Add New Client
              </h3>
              
              <form onSubmit={createClient} className="space-y-4">
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
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        +91
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 10) value = value.substring(0, 10);
                        setFormData({ ...formData, phoneNumber: value });
                      }}
                      placeholder="Enter 10-digit number"
                      maxLength={10}
                      className={`w-full pl-12 pr-4 py-2 border rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  {formData.phoneNumber && (
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Full number: +91{formData.phoneNumber}
                    </p>
                  )}
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

        {/* Edit Client Modal */}
        {showEditModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-2xl max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Edit Client
              </h3>
              
              <form onSubmit={updateClient} className="space-y-4">
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
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        +91
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="Enter 10-digit number"
                      maxLength={10}
                      className={`w-full pl-12 pr-4 py-2 border rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  {formData.phoneNumber && (
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Full number: +91{formData.phoneNumber}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedClient(null);
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
                  Delete Client
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

export default ClientManagement;
