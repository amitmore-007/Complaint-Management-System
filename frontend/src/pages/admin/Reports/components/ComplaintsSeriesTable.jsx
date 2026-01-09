import React, { useMemo } from "react";
import { formatPeriodLabel } from "../../../../utils/helpers";

const ComplaintsSeriesTable = ({ series, interval, isDarkMode }) => {
  const rows = useMemo(() => {
    const safe = Array.isArray(series) ? series : [];

    return safe.map((r) => ({
      period: r?.period,
      created: Number(r?.created || 0),
      resolved: Number(r?.resolved || 0),
    }));
  }, [series]);

  const hasRows = rows.length > 0;

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
            <th className="text-left font-semibold px-4 py-3">Period</th>
            <th className="text-right font-semibold px-4 py-3">Created</th>
            <th className="text-right font-semibold px-4 py-3">Resolved</th>
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            rows.map((r, idx) => (
              <tr
                key={`${r.period}-${idx}`}
                className={
                  isDarkMode
                    ? "border-t border-gray-800 text-gray-200"
                    : "border-t border-gray-200 text-gray-700"
                }
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatPeriodLabel(r.period, interval)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {r.created}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {r.resolved}
                </td>
              </tr>
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
                No data for the selected range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ComplaintsSeriesTable;
