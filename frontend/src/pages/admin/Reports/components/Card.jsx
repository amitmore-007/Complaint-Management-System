import React from "react";

const Card = ({ children, isDarkMode }) => (
  <div
    className={`rounded-3xl border shadow-xl ${
      isDarkMode
        ? "bg-gradient-to-b from-gray-900 to-black border-gray-800"
        : "bg-white border-gray-200"
    }`}
  >
    {children}
  </div>
);

export default Card;
