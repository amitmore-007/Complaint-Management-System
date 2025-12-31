import React from "react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  FileText,
  Users,
  Wrench,
  Shield,
  ClipboardList,
  Package,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import useAuthStore from "../../store/authStore";

const Sidebar = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();

  const getMenuItems = () => {
    switch (user?.role) {
      case "client":
        return [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/client/dashboard",
          },
          {
            icon: Plus,
            label: "Create Complaint",
            path: "/client/create-complaint",
          },
          {
            icon: FileText,
            label: "My Complaints",
            path: "/client/complaints",
          },
          { icon: Package, label: "Asset Records", path: "/client/assets" },
        ];
      case "technician":
        return [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/technician/dashboard",
          },
          {
            icon: ClipboardList,
            label: "My Assignments",
            path: "/technician/assignments",
          },
          {
            icon: Plus,
            label: "Create Complaint",
            path: "/technician/create-complaint",
          },
          {
            icon: CheckCircle,
            label: "My Resolved Assignments",
            path: "/technician/resolved-assignments",
          },
          {
            icon: FileText,
            label: "My Complaints",
            path: "/technician/my-complaints",
          },
          {
            icon: Package,
            label: "Asset Management",
            path: "/technician/assets",
          },
        ];
      case "admin":
        return [
          {
            icon: LayoutDashboard,
            label: "Dashboard",
            path: "/admin/dashboard",
          },
          {
            icon: BarChart3,
            label: "Reports",
            path: "/admin/reports",
          },
          {
            icon: Plus,
            label: "Create Complaint",
            path: "/admin/create-complaint",
          },
          {
            icon: FileText,
            label: "All Complaints",
            path: "/admin/complaints",
          },
          { icon: Users, label: "Manage Clients", path: "/admin/clients" },
          {
            icon: Wrench,
            label: "Manage Technicians",
            path: "/admin/technicians",
          },
          { icon: Package, label: "Asset Management", path: "/admin/assets" },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed left-0 top-0 h-full w-72 z-50 lg:relative lg:translate-x-0 lg:h-full ${
          isDarkMode
            ? "bg-gradient-to-b from-gray-900 to-black border-gray-800"
            : "bg-gradient-to-b from-white to-gray-50 border-gray-200"
        } border-r shadow-2xl lg:shadow-none flex flex-col`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          } flex-shrink-0`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-500 shadow-blue-500/25"
                  : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-blue-600/20"
              }`}
            >
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1
                className={`text-2xl font-bold ${
                  isDarkMode
                    ? "bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent"
                }`}
              >
                CMS
              </h1>
              <p
                className={`text-sm capitalize font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {user?.role} Portal
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div
          className={`p-6 border-b ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          } flex-shrink-0`}
        >
          <div className="flex items-center space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/20"
                  : "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-600/15"
              }`}
            >
              <span className="text-white font-bold text-xl">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p
                className={`font-bold text-lg ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {user?.name}
              </p>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {user?.phoneNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? `${
                            isDarkMode
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20"
                          }`
                        : `${
                            isDarkMode
                              ? "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                              : "text-gray-700 hover:bg-blue-50 hover:text-blue-900"
                          }`
                    }`
                  }
                  onClick={() => window.innerWidth < 1024 && onClose()}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div
                          className={`absolute inset-0 animate-pulse ${
                            isDarkMode
                              ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20"
                              : "bg-gradient-to-r from-blue-600/10 to-indigo-600/10"
                          }`}
                        ></div>
                      )}
                      <item.icon className="h-6 w-6 flex-shrink-0 relative z-10" />
                      <span className="font-semibold relative z-10">
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

      </motion.div>
    </>
  );
};

export default Sidebar;
