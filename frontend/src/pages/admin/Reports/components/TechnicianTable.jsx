import React from "react";
import TechnicianRow from "./TechnicianRow";

const TechnicianTable = ({ rows, isDarkMode }) => {
  const hasRows = Array.isArray(rows) && rows.length > 0;

  return (
    <div
      className={`rounded-2xl border ${
        isDarkMode ? "border-gray-800" : "border-gray-200"
      } overflow-x-auto`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            className={
              isDarkMode
                ? "bg-black/30 text-gray-200"
                : "bg-gray-50 text-gray-800"
            }
          >
            <th className="text-left font-semibold px-4 py-3">Technician</th>
            <th className="text-right font-semibold px-4 py-3">Assigned</th>
            <th className="text-right font-semibold px-4 py-3">Resolved</th>
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            rows.map((r, idx) => (
              <TechnicianRow
                key={`${r?.technicianId || r?.technicianName}-${idx}`}
                row={r}
                index={idx}
                isDarkMode={isDarkMode}
              />
            ))
          ) : (
            <tr
              className={
                isDarkMode
                  ? "border-t border-gray-800 text-gray-400"
                  : "border-t border-gray-200 text-gray-500"
              }
            >
              <td className="px-4 py-4" colSpan={3}>
                No technician data for the selected range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TechnicianTable;
