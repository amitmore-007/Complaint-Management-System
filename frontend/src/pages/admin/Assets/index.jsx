import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../../../context/ThemeContext";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import ManageListTab from "./components/ManageListTab";
import SubmittedRecordsTab from "./components/SubmittedRecordsTab";
import ContactNumbersTab from "./components/ContactNumbersTab";

const AdminAssetsPage = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("manage");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Asset Management
            </h1>
            <p
              className={`mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Manage equipment, view submissions, and store contacts
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`flex space-x-1 rounded-xl p-1 ${
            isDarkMode ? "bg-gray-800/50" : "bg-gray-100"
          }`}
        >
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "manage"
                ? "bg-blue-600 text-white shadow-lg"
                : isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            Manage List
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "records"
                ? "bg-blue-600 text-white shadow-lg"
                : isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            View Submitted Records
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === "contacts"
                ? "bg-blue-600 text-white shadow-lg"
                : isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            Contact No.s
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "manage" ? (
            <motion.div
              key="manage"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <ManageListTab isDarkMode={isDarkMode} />
            </motion.div>
          ) : activeTab === "records" ? (
            <motion.div
              key="records"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <SubmittedRecordsTab isDarkMode={isDarkMode} />
            </motion.div>
          ) : (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <ContactNumbersTab isDarkMode={isDarkMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default AdminAssetsPage;
