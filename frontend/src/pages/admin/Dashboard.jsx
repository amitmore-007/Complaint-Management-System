import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  UserCheck
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
      bgColor: 'from-primary-500 to-primary-600',
      link: '/admin/complaints'
    },
    {
      title: 'Pending',
      value: stats.pendingComplaints,
      icon: Clock,
      color: 'yellow',
      bgColor: 'from-yellow-500 to-yellow-600',
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
      bgColor: 'from-green-500 to-green-600',
      link: '/admin/complaints?status=resolved'
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'blue',
      bgColor: 'from-blue-500 to-blue-600',
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
            Admin Dashboard
          </h1>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
                <div className={`p-6 rounded-2xl shadow-lg border hover:shadow-xl transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}>
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
          className={`p-6 rounded-2xl shadow-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Complaints
            </h2>
            <Link 
              to="/admin/complaints"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </Link>
          </div>

          {stats.recentComplaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText className={`h-12 w-12 mx-auto mb-4 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={`text-lg font-medium ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No complaints yet
              </p>
              <p className={`mt-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Complaints will appear here as they are submitted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentComplaints.map((complaint) => (
                <motion.div
                  key={complaint._id}
                  className={`p-4 rounded-xl border ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  } hover:shadow-md transition-all duration-200`}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {complaint.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`text-xs font-medium capitalize ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      </div>
                      
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      } line-clamp-2 mb-3`}>
                        {complaint.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs">
                        <span className={`flex items-center space-x-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <Users className="h-3 w-3" />
                          <span>{complaint.client?.name}</span>
                        </span>
                        <span className={`flex items-center space-x-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <MapPin className="h-3 w-3" />
                          <span>{complaint.location}</span>
                        </span>
                        <span className={`flex items-center space-x-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>
                          ID: {complaint.complaintId}
                        </span>
                      </div>
                      
                      {complaint.assignedTechnician && (
                        <div className="mt-2 flex items-center space-x-1 text-xs">
                          <UserCheck className="h-3 w-3 text-blue-500" />
                          <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>
                            Assigned to: {complaint.assignedTechnician.name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <Link 
                      to={`/admin/complaints/${complaint._id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

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
