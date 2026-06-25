import React from "react";

const Card = ({ children, isDarkMode }) => (
  <div
    className={`rounded-3xl border ${
      isDarkMode
        ? "bg-[#111] border-white/10"
        : "bg-white border-gray-200"
    }`}
  >
    {children}
  </div>
);

export default Card;
