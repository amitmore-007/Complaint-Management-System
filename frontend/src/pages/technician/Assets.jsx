import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  MapPin, 
  Save, 
  RotateCcw,
  Calendar,
  Eye,
  Check,
  X,
  Plus,
  Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const TechnicianAssets = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [equipment, setEquipment] = useState([]);
  const [myRecords, setMyRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [equipmentData, setEquipmentData] = useState({});
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('submit');

  const storeOptions = [
    'Magarpatta', 'Kharadi', 'Viman Nagar', 'Wagholi', 'Koregaon Park',
    'MG Road', 'Salunkhe Vihar', 'JM Road', 'Aundh', 'Pimple Saudagar',
    'Balewadi', 'Chinchwad', 'Ravet', 'Wakad', 'Happiness Street',
    'Kothrud', 'Sinhgad Road', 'Hinjewadi', 'Undri'
  ];

  useEffect(() => {
    fetchEquipment();
    if (activeTab === 'history') {
      fetchMyRecords();
    }
  }, [activeTab]);

  const fetchEquipment = async () => {
    try {
      setIsLoading(true);
      console.log('Technician fetching equipment list...');
      const response = await api.get('/equipment/list');
      console.log('Technician equipment response:', response.data);
      const equipmentList = response.data.equipment || [];
      setEquipment(equipmentList);
      
      // Initialize equipment data
      const initialData = {};
      equipmentList.forEach(item => {
        initialData[item._id] = {
          equipmentId: item._id,
          name: item.name,
          isPresent: false,
          count: 0
        };
      });
      setEquipmentData(initialData);
    } catch (error) {
      console.error('Technician equipment fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch equipment list');
      setEquipment([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyRecords = async () => {
    try {
      setIsLoading(true);
      console.log('Technician fetching asset records...');
      const response = await api.get('/equipment/records/technician');
      console.log('Technician records response:', response.data);
      setMyRecords(response.data.records || []);
    } catch (error) {
      console.error('Technician records fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch your records');
      setMyRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquipmentChange = (equipmentId, field, value) => {
    setEquipmentData(prev => ({
      ...prev,
      [equipmentId]: {
        ...prev[equipmentId],
        [field]: value,
        // If marking as not present, reset count to 0
        ...(field === 'isPresent' && !value ? { count: 0 } : {})
      }
    }));
  };

  const incrementCount = (equipmentId) => {
    setEquipmentData(prev => ({
      ...prev,
      [equipmentId]: {
        ...prev[equipmentId],
        count: prev[equipmentId].count + 1,
        isPresent: true
      }
    }));
  };

  const decrementCount = (equipmentId) => {
    setEquipmentData(prev => ({
      ...prev,
      [equipmentId]: {
        ...prev[equipmentId],
        count: Math.max(0, prev[equipmentId].count - 1)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedStore) {
      toast.error('Please select a store');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const equipmentList = Object.values(equipmentData);
      
      await api.post('/equipment/records', {
        storeName: selectedStore,
        equipment: equipmentList,
        notes
      });
      
      toast.success('Asset record submitted successfully!');
      
      // Reset form
      setSelectedStore('');
      setNotes('');
      
      // Reset equipment data
      const resetData = {};
      equipment.forEach(item => {
        resetData[item._id] = {
          equipmentId: item._id,
          name: item.name,
          isPresent: false,
          count: 0
        };
      });
      setEquipmentData(resetData);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedStore('');
    setNotes('');
    const resetData = {};
    equipment.forEach(item => {
      resetData[item._id] = {
        equipmentId: item._id,
        name: item.name,
        isPresent: false,
        count: 0
      };
    });
    setEquipmentData(resetData);
  };

  if (isLoading && activeTab === 'submit') {
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
          <h1 className="text-3xl font-bold text-white">Asset Management</h1>
          <p className="text-gray-400 mt-1">Submit equipment records for stores</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'submit'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            Submit Record
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            My Submissions
          </button>
        </div>

        {/* Content */}
        {activeTab === 'submit' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Store Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Store *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Choose a store...</option>
                    {storeOptions.map((store, index) => (
                      <option key={index} value={store}>{store}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Equipment List */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Equipment Inventory
                </label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {equipment.map((item) => {
                    const itemData = equipmentData[item._id] || {};
                    return (
                      <div
                        key={item._id}
                        className={`p-4 rounded-xl border transition-all ${
                          itemData.isPresent
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-gray-700/50 border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={itemData.isPresent || false}
                                onChange={(e) => handleEquipmentChange(item._id, 'isPresent', e.target.checked)}
                                className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                              />
                              <div>
                                <h3 className="font-medium text-white">{item.name}</h3>
                                {item.category && (
                                  <p className="text-sm text-gray-400">{item.category}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {itemData.isPresent && (
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-300">Count:</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => decrementCount(item._id)}
                                  className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-lg flex items-center justify-center transition-colors"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-12 text-center text-white font-medium">
                                  {itemData.count || 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => incrementCount(item._id)}
                                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Any additional observations or notes..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedStore}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Submit Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          // History Tab
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : myRecords.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <p className="text-xl font-medium text-gray-400 mb-2">
                  No submissions yet
                </p>
                <p className="text-gray-500">
                  Your submitted asset records will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myRecords.map((record) => (
                  <motion.div
                    key={record._id}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{record.storeName}</h3>
                        <div className="flex items-center space-x-2 mt-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(record.submissionDate).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">{record.equipment?.length || 0}</span> equipment items recorded
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">
                          {record.equipment?.filter(item => item.isPresent).length || 0}
                        </span> items present
                      </div>
                    </div>

                    {record.notes && (
                      <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-300">
                          <span className="font-medium">Notes:</span> {record.notes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TechnicianAssets;
