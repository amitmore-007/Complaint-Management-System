import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Mobile Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop Sidebar - Fixed positioning */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-72 z-50">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Main Content Area - Adjusted for sidebar */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header - Only shown on mobile */}
        <div className={`lg:hidden sticky top-0 z-30 px-4 py-3 border-b ${
          isDarkMode 
            ? 'border-gray-800 bg-gray-900/95' 
            : 'border-gray-200 bg-white/95'
        } backdrop-blur-sm`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-800 text-white' 
                : 'hover:bg-gray-100 text-gray-900'
            }`}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page Content - Proper spacing */}
        <main className={`flex-1 p-4 lg:p-6 min-h-screen ${
          isDarkMode ? 'bg-black' : 'bg-gray-50'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;