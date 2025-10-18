import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const { isDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
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

        {/* Page Content - Proper spacing */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Toast Container with theme switching */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: '500',
            },
            success: {
              style: {
                background: isDarkMode 
                  ? 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)' 
                  : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: isDarkMode ? '1px solid #059669' : '1px solid #22c55e',
                color: isDarkMode ? '#ffffff' : '#15803d',
              },
            },
            error: {
              style: {
                background: isDarkMode 
                  ? 'linear-gradient(135deg, #7f1d1d 0%, #6b1616 100%)' 
                  : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: isDarkMode ? '1px solid #dc2626' : '1px solid #ef4444',
                color: isDarkMode ? '#ffffff' : '#dc2626',
              },
            },
            loading: {
              style: {
                background: isDarkMode 
                  ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
                  : 'white',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                color: isDarkMode ? '#f9fafb' : '#111827',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default DashboardLayout;