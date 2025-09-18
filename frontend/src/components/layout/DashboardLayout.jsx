import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Mobile Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop Sidebar - Fixed positioning */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:z-50">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Main Content Area */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className={`lg:hidden sticky top-0 z-30 px-4 py-3 border-b ${
          isDarkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <Menu className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
          </button>
        </div>

        {/* Page Content - Removed extra padding */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

