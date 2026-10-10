import React from "react";

import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useTheme } from "../../../context/ThemeContext";

import SmartDevicesPage from "./components/SmartDevicesPage";

const AdminSmartDevicesIndex = () => {
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
            Smart Devices
          </h1>
          <p
            className={`mt-2 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Live status and energy usage of the smart breakers at stores.
          </p>
        </div>

        <SmartDevicesPage isDarkMode={isDarkMode} />
      </div>
    </DashboardLayout>
  );
};

export default AdminSmartDevicesIndex;
