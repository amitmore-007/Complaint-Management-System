import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import useAuthStore from "../../store/authStore";
import ThemeToggle from "../common/ThemeToggle";
import Sidebar from "./Sidebar";

const DashboardLayout = ({ children }) => {
  const { isDarkMode } = useTheme();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div
      className={`min-h-screen flex ${isDarkMode ? "bg-black" : "bg-gray-50"}`}
    >
      {/* Mobile Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop Sidebar - Fixed positioning */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-72 z-50">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Main Content Area - Adjusted for sidebar */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Global Navbar */}
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-sm ${
            isDarkMode
              ? "border-gray-800 bg-gray-900/80"
              : "border-gray-200 bg-white/80"
          }`}
        >
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-gray-800 text-white"
                    : "hover:bg-gray-100 text-gray-900"
                }`}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-all border ${
                  isDarkMode
                    ? "text-red-300 border-gray-800 hover:border-red-800/50 hover:bg-red-950/40"
                    : "text-red-600 border-gray-200 hover:border-red-300 hover:bg-red-50"
                }`}
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content - Proper spacing */}
        <main
          className={`flex-1 p-4 lg:p-6 min-h-screen ${
            isDarkMode ? "bg-black" : "bg-gray-50"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
