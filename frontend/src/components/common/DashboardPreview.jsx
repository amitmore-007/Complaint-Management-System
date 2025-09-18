import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, CheckCircle, Clock } from 'lucide-react';

const DashboardPreview = ({ isDarkMode }) => {
  return (
    <div className={`w-140  h-100 rounded-2xl p-20  ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Dashboard Overview
        </h3>
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { icon: <Users className="h-4 w-4" />, value: "248", label: "Total" },
          { icon: <Clock className="h-4 w-4" />, value: "12", label: "Pending" },
          { icon: <CheckCircle className="h-4 w-4" />, value: "235", label: "Resolved" },
          { icon: <BarChart3 className="h-4 w-4" />, value: "98%", label: "Success" }
        ].map((stat, index) => (
          <motion.div
            key={index}
            className={`p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-primary-600">{stat.icon}</div>
              <span className={`text-lg font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {stat.value}
              </span>
            </div>
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Chart Area */}
      <div className={`h-20 rounded-lg ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
      } flex items-end justify-between p-3`}>
        {[40, 65, 45, 80, 55, 70, 60].map((height, index) => (
          <motion.div
            key={index}
            className="bg-primary-600 rounded-sm flex-1 mx-0.5"
            style={{ height: `${height}%` }}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardPreview;
