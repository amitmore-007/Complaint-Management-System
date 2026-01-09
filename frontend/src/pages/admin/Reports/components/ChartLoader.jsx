import React from "react";

const ChartLoader = ({ isDarkMode }) => (
  <div className="absolute inset-0 flex items-center justify-center z-10">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div
          className={`w-16 h-16 rounded-full border-4 ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}
        />
        <div
          className="absolute inset-0 w-16 h-16 rounded-full animate-spin"
          style={{
            background: isDarkMode
              ? "conic-gradient(from 0deg, transparent 0%, #3b82f6 50%, #8b5cf6 100%)"
              : "conic-gradient(from 0deg, transparent 0%, #3b82f6 50%, #4f46e5 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 50%, black 50%, black 55%, transparent 55%)",
            maskImage:
              "radial-gradient(circle, transparent 50%, black 50%, black 55%, transparent 55%)",
          }}
        />
        <div
          className={`absolute inset-0 m-auto w-3 h-3 rounded-full animate-pulse ${
            isDarkMode
              ? "bg-gradient-to-r from-blue-500 to-purple-500"
              : "bg-gradient-to-r from-blue-600 to-indigo-600"
          }`}
        />
      </div>
      <p
        className={`text-sm font-semibold animate-pulse ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        Loading chart data...
      </p>
    </div>
  </div>
);

export default ChartLoader;
