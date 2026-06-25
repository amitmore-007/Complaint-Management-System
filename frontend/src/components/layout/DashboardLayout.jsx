import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Phone, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import useAuthStore from "../../store/authStore";
import Sidebar from "./Sidebar";

const DashboardLayout = ({ children }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`min-h-screen flex ${isDarkMode ? "bg-black" : "bg-gray-100"}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-sm ${
            isDarkMode
              ? "border-white/10 bg-black/80"
              : "border-gray-200 bg-gray-100/80"
          }`}
        >
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-white/10 text-white" : "hover:bg-gray-200 text-gray-900"
              }`}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="ml-auto" ref={menuRef}>
              {/* Avatar trigger button */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ring-2 ${
                  menuOpen
                    ? "ring-blue-500"
                    : isDarkMode
                    ? "ring-white/10 hover:ring-blue-500"
                    : "ring-gray-200 hover:ring-blue-400"
                } bg-blue-600 text-white`}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div
                  className={`absolute right-4 mt-2 w-64 rounded-xl border shadow-xl overflow-hidden ${
                    isDarkMode
                      ? "bg-[#111] border-white/10"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {/* User info */}
                  <div className={`px-4 py-4 border-b ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-white">
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {user?.name}
                        </p>
                        <p className={`text-xs capitalize ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>
                          {user?.role}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-3 flex items-center gap-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{user?.phoneNumber}</span>
                    </div>
                  </div>

                  {/* Theme toggle */}
                  <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      isDarkMode
                        ? "text-gray-300 hover:bg-white/10"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? "bg-white/10" : "bg-gray-100"
                    }`}>
                      {isDarkMode ? (
                        <Moon className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Sun className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </button>

                  {/* Logout */}
                  <div className={`border-t ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                        isDarkMode
                          ? "text-red-400 hover:bg-red-950/40"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <span>Logout</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDarkMode ? "bg-red-950/50" : "bg-red-50"
                      }`}>
                        <LogOut className="h-4 w-4" />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

