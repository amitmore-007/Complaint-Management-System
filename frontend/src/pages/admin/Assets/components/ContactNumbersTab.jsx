import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit, Phone, Plus, Search, Trash2, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useStoresList,
  useUpdateStoreManagers,
} from "../../../../hooks/useStores";

const ContactNumbersTab = ({ isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditStoreContactsModal, setShowEditStoreContactsModal] =
    useState(false);
  const [selectedStoreForContacts, setSelectedStoreForContacts] =
    useState(null);
  const [storeManagersForContacts, setStoreManagersForContacts] = useState([]);

  const {
    data: stores = [],
    isLoading,
    refetch: refetchStores,
  } = useStoresList();
  const updateStoreManagersMutation = useUpdateStoreManagers();

  const filteredStores = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return stores.filter((store) => {
      if (!q) return true;

      const nameMatch = String(store?.name || "")
        .toLowerCase()
        .includes(q);
      if (nameMatch) return true;

      const managers = Array.isArray(store?.managers) ? store.managers : [];
      return managers.some((m) => {
        const label = String(m?.name || "").toLowerCase();
        const phone = String(m?.phoneNumber || "").toLowerCase();
        return label.includes(q) || phone.includes(q);
      });
    });
  }, [stores, searchTerm]);

  const openEditStoreContactsModal = (store) => {
    setSelectedStoreForContacts(store);
    setStoreManagersForContacts(
      Array.isArray(store?.managers) ? store.managers : [],
    );
    setShowEditStoreContactsModal(true);
  };

  const addStoreContactRow = () => {
    setStoreManagersForContacts((prev) => [
      ...prev,
      { name: "", phoneNumber: "" },
    ]);
  };

  const removeStoreContactRow = (index) => {
    setStoreManagersForContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStoreContactRow = (index, field, value) => {
    setStoreManagersForContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveStoreContacts = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedStoreForContacts?._id) {
      toast.error("Please select a store");
      return;
    }

    if (updateStoreManagersMutation.isPending) return;

    try {
      await updateStoreManagersMutation.mutateAsync({
        storeId: selectedStoreForContacts._id,
        managers: storeManagersForContacts,
      });
      toast.success("Store contacts updated successfully");
      setShowEditStoreContactsModal(false);
      setSelectedStoreForContacts(null);
      setStoreManagersForContacts([]);
      refetchStores?.();
    } catch (error) {
      console.error("Update store contacts error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update store contacts",
      );
    }
  };

  return (
    <>
      {/* Search */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search store or contact..."
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
          onClick={() => refetchStores?.()}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            isDarkMode
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-200 hover:bg-gray-300 text-gray-900"
          }`}
        >
          Refresh
        </button>
      </div>

      {/* Store Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <motion.div
              key={store._id}
              className={`border rounded-xl p-6 transition-colors ${
                isDarkMode
                  ? "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? "bg-blue-600/20" : "bg-blue-100"
                    }`}
                  >
                    <Phone
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
                      {store.name}
                    </h3>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {(store.managers?.length || 0) === 0
                        ? "No contacts added"
                        : `${store.managers.length} contact(s)`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openEditStoreContactsModal(store)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
                      : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                  title="Edit Contacts"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>

              <div
                className={`space-y-2 text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {(Array.isArray(store.managers) ? store.managers : [])
                  .slice(0, 4)
                  .map((m, idx) => (
                    <div
                      key={`${store._id}-${idx}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="truncate">
                        {m?.name || "(No label)"}
                      </span>
                      <span
                        className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {m?.phoneNumber || "-"}
                      </span>
                    </div>
                  ))}

                {Array.isArray(store.managers) && store.managers.length > 4 && (
                  <div
                    className={isDarkMode ? "text-gray-400" : "text-gray-500"}
                  >
                    +{store.managers.length - 4} more
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Store Contacts Modal */}
      <AnimatePresence>
        {showEditStoreContactsModal && selectedStoreForContacts && (
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
            onClick={() => setShowEditStoreContactsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-2xl p-6 w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-4 my-4 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2
                    className={`text-xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Contact No.s
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Store:{" "}
                    <span className="font-semibold">
                      {selectedStoreForContacts.name}
                    </span>
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Tip: You can use labels like “Outlet Manager”, “Store No”,
                    etc.
                  </p>
                </div>
                <button
                  onClick={() => setShowEditStoreContactsModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "text-gray-400 hover:text-white hover:bg-gray-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={saveStoreContacts} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className={`block text-sm font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Contacts (Label + Number)
                    </label>
                    <button
                      type="button"
                      onClick={addStoreContactRow}
                      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isDarkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {storeManagersForContacts.length === 0 && (
                      <p
                        className={
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }
                      >
                        No contacts added.
                      </p>
                    )}

                    {storeManagersForContacts.map((m, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-xl ${
                          isDarkMode
                            ? "bg-gray-700/50 border-gray-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={m?.name || ""}
                            onChange={(e) =>
                              updateStoreContactRow(
                                index,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="Label (e.g. Outlet Manager)"
                            className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                            }`}
                          />
                          <input
                            type="text"
                            value={m?.phoneNumber || ""}
                            onChange={(e) =>
                              updateStoreContactRow(
                                index,
                                "phoneNumber",
                                e.target.value,
                              )
                            }
                            placeholder="Number"
                            className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                            }`}
                          />
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeStoreContactRow(index)}
                            className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isDarkMode
                                ? "bg-gray-700 hover:bg-gray-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditStoreContactsModal(false);
                      setSelectedStoreForContacts(null);
                      setStoreManagersForContacts([]);
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
                    disabled={updateStoreManagersMutation.isPending}
                    className={`flex-1 py-3 px-4 rounded-xl transition-colors inline-flex items-center justify-center gap-2 ${
                      updateStoreManagersMutation.isPending
                        ? "bg-blue-600/70 text-white cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {updateStoreManagersMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {updateStoreManagersMutation.isPending
                        ? "Saving..."
                        : "Save Contacts"}
                    </span>
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

export default ContactNumbersTab;
