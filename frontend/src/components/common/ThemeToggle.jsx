import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
        isDarkMode
          ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600 border border-gray-600'
          : 'bg-gray-100 text-orange-500 hover:bg-gray-200 border border-gray-300'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDarkMode ? 0 : 180,
          scale: 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {isDarkMode ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </motion.div>

      {/* Background glow effect */}
      <div
        className={`absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
          isDarkMode
            ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20'
            : 'bg-gradient-to-r from-orange-400/20 to-yellow-400/20'
        }`}
      />
    </motion.button>
  );
};

export default ThemeToggle;
