import React, { useState, useEffect } from "react";
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
  Receipt,
  Settings,
  Clock,
  CalendarCheck,
  Menu,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import useAuthStore from "../../store/authStore";

const Sidebar = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const collapsed = !isMobile && isCollapsed;

  const getMenuItems = () => {
    switch (user?.role) {
      case "client":
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/client/dashboard" },
          { icon: Plus, label: "Create Complaint", path: "/client/create-complaint" },
          { icon: FileText, label: "My Complaints", path: "/client/complaints" },
          { icon: Package, label: "Asset Records", path: "/client/assets" },
        ];
      case "technician":
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/technician/dashboard" },
          { icon: ClipboardList, label: "My Assignments", path: "/technician/assignments" },
          { icon: Receipt, label: "Billing", path: "/technician/billing" },
          { icon: Plus, label: "Create Complaint", path: "/technician/create-complaint" },
          { icon: CheckCircle, label: "Resolved Assignments", path: "/technician/resolved-assignments" },
          { icon: FileText, label: "My Complaints", path: "/technician/my-complaints" },
          { icon: Package, label: "Asset Management", path: "/technician/assets" },
          { icon: Clock, label: "My Attendance", path: "/technician/attendance" },
        ];
      case "admin":
        return [
          { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
          { icon: BarChart3, label: "Reports", path: "/admin/reports" },
          { icon: Receipt, label: "Billing", path: "/admin/billing" },
          { icon: Plus, label: "Create Complaint", path: "/admin/create-complaint" },
          { icon: FileText, label: "All Complaints", path: "/admin/complaints" },
          { icon: Users, label: "Manage Clients", path: "/admin/clients" },
          { icon: Wrench, label: "Manage Technicians", path: "/admin/technicians" },
          { icon: Package, label: "Asset Management", path: "/admin/assets" },
          { icon: Settings, label: "Settings", path: "/admin/settings" },
          { icon: CalendarCheck, label: "Attendance", path: "/admin/attendance" },
          { icon: Clock, label: "My Attendance", path: "/admin/my-attendance" },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const borderColor = isDarkMode ? "border-white/10" : "border-gray-200";
  const bg = isDarkMode ? "bg-black" : "bg-white";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-40"
          onClick={onClose}
        />
      )}

      <motion.div
        initial={false}
        animate={{
          x: isMobile ? (isOpen ? 0 : -300) : 0,
          width: collapsed ? 64 : 256,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
          fixed left-0 top-0 h-full z-50 flex flex-col overflow-hidden
          lg:relative lg:h-auto lg:self-stretch flex-shrink-0
          border-r ${borderColor} ${bg}
        `}
      >
        {/* Brand header â€” same height as topbar (py-3 + h-9 content) */}
        <div className={`px-3 py-[11px] border-b flex-shrink-0 ${borderColor}`}>
          {collapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${
                isDarkMode ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={`text-base font-bold leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    CMS
                  </p>
                  <p className="text-xs capitalize text-blue-500 mt-0.5">
                    {user?.role} Portal
                  </p>
                </div>
              </div>

              {/* Collapse button â€” desktop only */}
              <button
                onClick={() => isMobile ? onClose() : setIsCollapsed(true)}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isDarkMode
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-6 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.path}
                  onClick={() => isMobile && onClose()}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg text-[15px] font-medium transition-colors duration-150 ${
                      collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3"
                    } ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : isDarkMode
                        ? "text-gray-400 hover:text-white hover:bg-white/10"
                        : "text-gray-600 hover:text-blue-700 hover:bg-blue-50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`flex-shrink-0 ${collapsed ? "h-5 w-5" : "h-[18px] w-[18px]"} ${
                          isActive ? "text-white" : "text-blue-500"
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
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

