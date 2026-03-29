import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit, Package, Plus, Search, Trash2, X, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCreateEquipment,
  useDeleteEquipment,
  useEquipmentList,
  useUpdateEquipment,
} from "../../../../hooks/useEquipment";

const emptyField = () => ({ key: "", value: "", subFields: [] });
const emptySubField = () => ({ key: "", value: "" });

const ManageListTab = ({ isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [formData, setFormData] = useState({ name: "", fields: [] });

  const { data: equipment = [], isLoading } = useEquipmentList();
  const createEquipmentMutation = useCreateEquipment();
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();

  const filteredEquipment = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return equipment.filter((item) => item.name.toLowerCase().includes(q));
  }, [equipment, searchTerm]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  const addField = () =>
    setFormData((prev) => ({ ...prev, fields: [...prev.fields, emptyField()] }));

  const removeField = (fi) =>
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== fi),
    }));

  const updateField = (fi, prop, value) =>
    setFormData((prev) => {
      const fields = [...prev.fields];
      fields[fi] = { ...fields[fi], [prop]: value };
      return { ...prev, fields };
    });

  const addSubField = (fi) =>
    setFormData((prev) => {
      const fields = [...prev.fields];
      fields[fi] = {
        ...fields[fi],
        value: "",
        subFields: [...(fields[fi].subFields || []), emptySubField()],
      };
      return { ...prev, fields };
    });

  const removeSubField = (fi, si) =>
    setFormData((prev) => {
      const fields = [...prev.fields];
      fields[fi] = {
        ...fields[fi],
        subFields: fields[fi].subFields.filter((_, i) => i !== si),
      };
      return { ...prev, fields };
    });

  const updateSubField = (fi, si, prop, value) =>
    setFormData((prev) => {
      const fields = [...prev.fields];
      const subFields = [...fields[fi].subFields];
      subFields[si] = { ...subFields[si], [prop]: value };
      fields[fi] = { ...fields[fi], subFields };
      return { ...prev, fields };
    });

  // ── Handlers ───────────────────────────────────────────────────────────────

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
      setFormData({ name: "", fields: [] });
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

    // Validate: every field must have a key
    for (const field of formData.fields) {
      if (!field.key.trim()) {
        toast.error("All fields must have a label");
        return;
      }
      for (const sub of field.subFields || []) {
        if (!sub.key.trim()) {
          toast.error("All sub-fields must have a label");
          return;
        }
      }
    }

    if (updateEquipmentMutation.isPending) return;

    try {
      await updateEquipmentMutation.mutateAsync({
        id: selectedEquipment._id,
        name: formData.name.trim(),
        fields: formData.fields,
      });
      toast.success("Equipment updated successfully");
      setShowEditModal(false);
      setSelectedEquipment(null);
      setFormData({ name: "", fields: [] });
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
    setFormData({ name: item.name, fields: item.fields || [] });
    setShowEditModal(true);
  };

  // ── Shared input styles ────────────────────────────────────────────────────

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
  }`;

  const labelCls = `block text-xs font-medium mb-1 ${
    isDarkMode ? "text-gray-400" : "text-gray-500"
  }`;

  // ── Render ─────────────────────────────────────────────────────────────────

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
                    {(item.fields || []).length > 0 && (
                      <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {item.fields.length} field{item.fields.length !== 1 ? "s" : ""}
                      </p>
                    )}
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

              {/* Preview defined fields */}
              {(item.fields || []).length > 0 && (
                <div className={`mt-2 space-y-1 border-t pt-3 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
                  {item.fields.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-start gap-1 text-xs">
                      <span className={`font-medium shrink-0 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                        {f.key}:
                      </span>
                      {(f.subFields || []).length > 0 ? (
                        <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                          {f.subFields.map((s) => s.key).join(", ")}
                        </span>
                      ) : (
                        <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                          {f.value || "—"}
                        </span>
                      )}
                    </div>
                  ))}
                  {item.fields.length > 3 && (
                    <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      +{item.fields.length - 3} more
                    </p>
                  )}
                </div>
              )}
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
            style={{ margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}
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
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
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
                      setFormData({ name: "", fields: [] });
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
            style={{ margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl w-full max-w-lg mx-4 my-4 flex flex-col max-h-[90vh] ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className={`px-6 pt-6 pb-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
                <h2
                  className={`text-xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Edit Equipment
                </h2>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <form id="editEquipmentForm" onSubmit={handleEditEquipment} className="space-y-5">
                  {/* Name */}
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
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Enter equipment name"
                      className={`w-full px-4 py-3 border rounded-xl transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                  </div>

                  {/* Custom Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Custom Fields
                      </span>
                      <button
                        type="button"
                        onClick={addField}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add Field
                      </button>
                    </div>

                    {formData.fields.length === 0 && (
                      <p className={`text-xs text-center py-3 rounded-lg border border-dashed ${
                        isDarkMode ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-200"
                      }`}>
                        No custom fields yet. Click "Add Field" to define attributes for this equipment.
                      </p>
                    )}

                    {formData.fields.map((field, fi) => {
                      const hasSubFields = (field.subFields || []).length > 0;
                      return (
                        <div
                          key={fi}
                          className={`rounded-lg border p-3 space-y-2 ${
                            isDarkMode ? "bg-gray-700/40 border-gray-600" : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          {/* Field row */}
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className={labelCls}>Field Label *</label>
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => updateField(fi, "key", e.target.value)}
                                placeholder="e.g. Model, Input Capacity"
                                className={inputCls}
                              />
                            </div>

                            {!hasSubFields && (
                              <div className="flex-1">
                                <label className={labelCls}>Value</label>
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => updateField(fi, "value", e.target.value)}
                                  placeholder="e.g. XL-200"
                                  className={inputCls}
                                />
                              </div>
                            )}

                            <div className="flex gap-1 pb-0.5">
                              <button
                                type="button"
                                onClick={() => addSubField(fi)}
                                title="Add sub-field"
                                className={`p-2 rounded-lg text-xs transition-colors ${
                                  isDarkMode
                                    ? "text-blue-400 hover:bg-blue-500/10"
                                    : "text-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeField(fi)}
                                title="Remove field"
                                className={`p-2 rounded-lg transition-colors ${
                                  isDarkMode
                                    ? "text-red-400 hover:bg-red-500/10"
                                    : "text-red-500 hover:bg-red-50"
                                }`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sub-fields */}
                          {hasSubFields && (
                            <div className="pl-3 border-l-2 border-blue-500/30 space-y-2">
                              {field.subFields.map((sub, si) => (
                                <div key={si} className="flex gap-2 items-end">
                                  <div className="flex-1">
                                    {si === 0 && <label className={labelCls}>Sub-field Label *</label>}
                                    <input
                                      type="text"
                                      value={sub.key}
                                      onChange={(e) => updateSubField(fi, si, "key", e.target.value)}
                                      placeholder="e.g. AC, DC"
                                      className={inputCls}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    {si === 0 && <label className={labelCls}>Value</label>}
                                    <input
                                      type="text"
                                      value={sub.value}
                                      onChange={(e) => updateSubField(fi, si, "value", e.target.value)}
                                      placeholder="e.g. 220V"
                                      className={inputCls}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSubField(fi, si)}
                                    className={`p-2 rounded-lg transition-colors mb-0.5 ${
                                      isDarkMode
                                        ? "text-red-400 hover:bg-red-500/10"
                                        : "text-red-500 hover:bg-red-50"
                                    }`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addSubField(fi)}
                                className={`text-xs flex items-center gap-1 transition-colors ${
                                  isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                                }`}
                              >
                                <Plus className="h-3 w-3" /> Add sub-field
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </form>
              </div>

              {/* Footer buttons */}
              <div className={`px-6 pb-6 pt-4 border-t flex space-x-3 ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEquipment(null);
                    setFormData({ name: "", fields: [] });
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
                  form="editEquipmentForm"
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  Update Equipment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ManageListTab;
