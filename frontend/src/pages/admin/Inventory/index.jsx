import React from "react";

import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useTheme } from "../../../context/ThemeContext";

import AdminInventoryPage from "./components/AdminInventoryPage";

const AdminInventoryIndex = () => {
  const { isDarkMode } = useTheme();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Inventory Dashboard
          </h1>
          <p
            className={`mt-2 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Track inventory purchases and the items technicians can bill
            against.
          </p>
        </div>

        <AdminInventoryPage isDarkMode={isDarkMode} />
      </div>
    </DashboardLayout>
  );
};

export default AdminInventoryIndex;
