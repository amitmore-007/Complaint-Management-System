import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme ? savedTheme === 'dark' : true; // Default to dark mode
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

      // Apply theme to document
      const root = document.documentElement;
      if (isDarkMode) {
        root.classList.add('dark');
        document.body.style.backgroundColor = '#111827'; // gray-900
        document.body.style.color = '#ffffff';

        // Set CSS custom properties for dark mode
        root.style.setProperty('--bg-primary', '#111827');
        root.style.setProperty('--bg-secondary', '#1f2937');
        root.style.setProperty('--bg-tertiary', '#374151');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#d1d5db');
        root.style.setProperty('--text-tertiary', '#9ca3af');
        root.style.setProperty('--border-primary', '#374151');
        root.style.setProperty('--border-secondary', '#4b5563');
      } else {
        root.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';

        // Set CSS custom properties for light mode
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f9fafb');
        root.style.setProperty('--bg-tertiary', '#f3f4f6');
        root.style.setProperty('--text-primary', '#111827');
        root.style.setProperty('--text-secondary', '#374151');
        root.style.setProperty('--text-tertiary', '#6b7280');
        root.style.setProperty('--border-primary', '#e5e7eb');
        root.style.setProperty('--border-secondary', '#d1d5db');
      }
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
