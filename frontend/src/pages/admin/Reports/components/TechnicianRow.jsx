import React from "react";

const TechnicianRow = ({ row, index, isDarkMode }) => {
  return (
    <tr
      key={`${row?.technicianId || row?.technicianName}-${index}`}
      className={
        isDarkMode
          ? "border-t border-gray-800 text-gray-200"
          : "border-t border-gray-200 text-gray-800"
      }
    >
      <td className="px-4 py-3 whitespace-nowrap max-w-[220px] truncate">
        {row?.technicianName || "Unknown"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {row?.assigned ?? 0}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {row?.resolved ?? 0}
      </td>
    </tr>
  );
};

export default TechnicianRow;
