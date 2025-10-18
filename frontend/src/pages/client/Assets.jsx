import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Calendar,
  User,
  MapPin,
  Check,
  X,
  Eye,
  Search,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const ClientAssets = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [assetRecords, setAssetRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAssetRecords();
  }, []);

  const fetchAssetRecords = async () => {
    try {
      setIsLoading(true);
   
      const response = await api.get('/equipment/records/client');
  
      setAssetRecords(response.data.records || []);
    } catch (error) {
      console.error('Client records fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch asset records');
      setAssetRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openDetailModal = async (record) => {
    try {
     
      const response = await api.get(`/equipment/records/${record._id}`);
      setSelectedRecord(response.data.record);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Record details fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch record details');
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRecord(null);
  };

  const filteredRecords = assetRecords.filter(record =>
    record.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.technician?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Asset Records</h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>View equipment records submitted for your stores</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search by store or technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <Package className={`h-16 w-16 mx-auto mb-4 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`text-xl font-medium mb-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {searchTerm ? 'No matching records found' : 'No asset records yet'}
            </p>
            <p className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Asset records submitted for your stores will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRecords.map((record) => (
              <motion.div
                key={record._id}
                className={`border rounded-xl p-6 transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => openDetailModal(record)}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`font-semibold text-lg ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{record.storeName}</h3>
                    <div className={`flex items-center space-x-4 mt-2 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{record.technician?.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(record.submissionDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-blue-400 hover:bg-blue-500/10'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}>
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="font-medium">{record.equipment?.length || 0}</span> equipment items recorded
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="font-medium text-green-400">
                      {record.equipment?.filter(item => item.isPresent).length || 0}
                    </span> items present
                  </div>
                  <div className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <span className="font-medium text-red-400">
                      {record.equipment?.filter(item => !item.isPresent).length || 0}
                    </span> items missing
                  </div>
                </div>

                {record.notes && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700/50'
                      : 'bg-gray-50'
                  }`}>
                    <p className={`text-sm line-clamp-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <span className="font-medium">Notes:</span> {record.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={closeDetailModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{selectedRecord.storeName}</h2>
                    <div className={`flex items-center space-x-4 mt-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <span>By: {selectedRecord.technician?.name}</span>
                      <span>•</span>
                      <span>{new Date(selectedRecord.submissionDate).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={closeDetailModal}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedRecord.equipment?.map((item, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-4 rounded-xl border ${
                        item.isPresent 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.isPresent ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {item.isPresent ? (
                            <Check className="h-5 w-5 text-white" />
                          ) : (
                            <X className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <span className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>{item.name}</span>
                      </div>
                      {item.isPresent && (
                        <span className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Count: {item.count}
                        </span>
                      )}
                      {!item.isPresent && (
                        <span className="text-red-400 font-medium text-sm">
                          Not Found
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {selectedRecord.notes && (
                  <div className={`mt-6 p-4 rounded-xl ${
                    isDarkMode 
                      ? 'bg-gray-700/50'
                      : 'bg-gray-50'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Technician Notes:</h4>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{selectedRecord.notes}</p>
                  </div>
                )}

                <div className={`mt-6 p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border-blue-700/50'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between text-sm">
                    <div className={isDarkMode ? 'text-blue-300' : 'text-blue-700'}>
                      <span className="font-medium">Total Items:</span> {selectedRecord.equipment?.length || 0}
                    </div>
                    <div className="text-green-400">
                      <span className="font-medium">Present:</span> {selectedRecord.equipment?.filter(item => item.isPresent).length || 0}
                    </div>
                    <div className="text-red-400">
                      <span className="font-medium">Missing:</span> {selectedRecord.equipment?.filter(item => !item.isPresent).length || 0}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ClientAssets;
