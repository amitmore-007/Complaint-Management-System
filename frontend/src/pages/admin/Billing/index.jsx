import React from "react";

import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useTheme } from "../../../context/ThemeContext";

import AdminBillingPage from "./components/AdminBillingPage";

const AdminBillingIndex = () => {
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
            Billing
          </h1>
          <p
            className={`mt-2 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Review technician billing submissions and edit material details.
          </p>
        </div>

        <AdminBillingPage isDarkMode={isDarkMode} />
      </div>
    </DashboardLayout>
  );
};

export default AdminBillingIndex;
