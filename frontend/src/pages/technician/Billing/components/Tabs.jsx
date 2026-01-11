import React from "react";

const Tabs = ({ tabs, active, onChange, isDarkMode }) => (
  <div className="w-full sm:w-auto overflow-x-auto">
    <div
      className={`w-max sm:w-auto flex rounded-2xl p-1 border shadow-sm ${
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
      }`}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              isActive
                ? isDarkMode
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                : isDarkMode
                ? "text-gray-300 hover:bg-gray-800"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            type="button"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default Tabs;
