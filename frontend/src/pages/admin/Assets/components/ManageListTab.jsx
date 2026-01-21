import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit, Package, Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCreateEquipment,
  useDeleteEquipment,
  useEquipmentList,
  useUpdateEquipment,
} from "../../../../hooks/useEquipment";

const ManageListTab = ({ isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [formData, setFormData] = useState({ name: "" });

  const { data: equipment = [], isLoading } = useEquipmentList();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();

  const filteredEquipment = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return equipment.filter((item) => item.name.toLowerCase().includes(q));
  }, [equipment, searchTerm]);

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.name || !formData.name.trim()) {
      toast.error("Please enter equipment name");
      return;
    }

    if (createEquipmentMutation.isPending) return;

    try {
      await createEquipmentMutation.mutateAsync({ name: formData.name.trim() });
      toast.success("Equipment added successfully");
      setShowAddModal(false);
      setFormData({ name: "" });
    } catch (error) {
      console.error("Add equipment error:", error);
      toast.error(error.response?.data?.message || "Failed to add equipment");
    }
  };

  const handleEditEquipment = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedEquipment?._id) {
      toast.error("Please select equipment");
      return;
    }

    if (!formData.name || !formData.name.trim()) {
      toast.error("Please enter equipment name");
      return;
    }

    if (updateEquipmentMutation.isPending) return;

    try {
      await updateEquipmentMutation.mutateAsync({
        id: selectedEquipment._id,
        name: formData.name.trim(),
      });
      toast.success("Equipment updated successfully");
      setShowEditModal(false);
      setSelectedEquipment(null);
      setFormData({ name: "" });
    } catch (error) {
      console.error("Edit equipment error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update equipment",
      );
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this equipment?"))
      return;

    try {
      await deleteEquipmentMutation.mutateAsync(id);
      toast.success("Equipment deleted successfully");
    } catch (error) {
      console.error("Delete equipment error:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete equipment",
      );
    }
  };

  const openEditModal = (item) => {
    setSelectedEquipment(item);
    setFormData({ name: item.name });
    setShowEditModal(true);
  };

  return (
    <>
      {/* Search and Add */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 border rounded-xl transition-colors ${
              isDarkMode
                ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            }`}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* Equipment List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => (
            <motion.div
              key={item._id}
              className={`border rounded-xl p-6 transition-colors ${
                isDarkMode
                  ? "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? "bg-blue-600/20" : "bg-blue-100"
                    }`}
                  >
                    <Package
                      className={`h-6 w-6 ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h3
                      className={`font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {item.name}
                    </h3>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                        : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEquipment(item._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Equipment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            style={{
              margin: 0,
              padding: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl p-6 w-full max-w-md mx-4 my-4 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                className={`text-xl font-bold mb-6 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Add New Equipment
              </h2>
              <form onSubmit={handleAddEquipment} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="Enter equipment name"
                    className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormData({ name: "" });
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                  >
                    Add Equipment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Equipment Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            style={{
              margin: 0,
              padding: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl p-6 w-full max-w-md mx-4 my-4 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                className={`text-xl font-bold mb-6 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Edit Equipment
              </h2>
              <form onSubmit={handleEditEquipment} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="Enter equipment name"
                    className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedEquipment(null);
                      setFormData({ name: "" });
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl transition-colors ${
                      isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                  >
                    Update Equipment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ManageListTab;
