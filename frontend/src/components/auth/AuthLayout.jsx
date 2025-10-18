import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../common/ThemeToggle';

const AuthLayout = ({ children, title, subtitle, showBackButton = true }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-20 left-20 w-64 h-64 rounded-full opacity-20 blur-3xl ${
          isDarkMode ? 'bg-blue-900/40' : 'bg-primary-100'
        }`}></div>
        <div className={`absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-20 blur-3xl ${
          isDarkMode ? 'bg-green-900/40' : 'bg-success-100'
        }`}></div>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-900/80 border-gray-800/50' 
            : 'bg-white/80 border-gray-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {showBackButton && (
                <motion.button
                  onClick={() => navigate(-1)}
                  className={`flex items-center space-x-2 transition-colors duration-200 ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-blue-400' 
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                  whileHover={{ x: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium text-sm sm:text-base">Back</span>
                </motion.button>
              )}
              
              <motion.div 
                className="flex items-center space-x-2 sm:space-x-3"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="w-20 h-12 sm:w-30 sm:h-16 flex items-center justify-center overflow-hidden rounded-lg">
                  <img 
                    src="/assets/Logo.png" 
                    alt="CMS Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  CMS
                </span>
              </motion.div>
            </div>
            
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 py-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`rounded-2xl p-8 shadow-2xl backdrop-blur-lg border ${
              isDarkMode 
                ? 'bg-gray-800/50 border-gray-700/50' 
                : 'bg-white/80 border-gray-200/50'
            }`}
          >
            <div className="text-center mb-8">
              <h1 className={`text-3xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`text-lg ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {subtitle}
                </p>
              )}
            </div>
            
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
