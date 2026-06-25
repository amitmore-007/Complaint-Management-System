import React from "react";

const Tabs = ({ tabs, active, onChange, isDarkMode }) => (
  <div className="w-full sm:w-auto overflow-x-auto">
    <div
      className={`w-max sm:w-auto flex rounded-2xl p-1 border shadow-sm ${
        isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
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
                  ? "bg-blue-600 text-white"
                  : "bg-blue-600 text-white"
                : isDarkMode
                ? "text-gray-300 hover:bg-white/5"
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

