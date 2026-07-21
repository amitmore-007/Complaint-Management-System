import React from "react";
import { AlertTriangle } from "lucide-react";

import { useAdminStockBalance } from "../../../../hooks/useInventory";

const StockBalanceTable = ({ isDarkMode }) => {
  const stockBalanceQuery = useAdminStockBalance();
  const balances = stockBalanceQuery.data ?? [];

  if (stockBalanceQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div
        className={`p-8 rounded-2xl border text-center ${
          isDarkMode
            ? "bg-[#111] border-white/10 text-gray-300"
            : "bg-white border-gray-200 text-gray-700"
        }`}
      >
        No inventory items added yet.
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border overflow-x-auto ${
        isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
      }`}
    >
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr
            className={`text-xs font-bold uppercase ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <th className="text-left px-4 py-3">Item Name</th>
            <th className="text-right px-4 py-3">Purchased</th>
            <th className="text-right px-4 py-3">Used</th>
            <th className="text-right px-4 py-3">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((row) => {
            const low = row.remainingQty <= 0;
            return (
              <tr
                key={row.itemId}
                className={`border-t ${
                  isDarkMode ? "border-white/10" : "border-gray-100"
                }`}
              >
                <td
                  className={`px-4 py-3 font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {row.itemName}
                </td>
                <td
                  className={`px-4 py-3 text-right ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {row.purchasedQty}
                </td>
                <td
                  className={`px-4 py-3 text-right ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {row.usedQty}
                </td>
                <td
                  className={`px-4 py-3 text-right font-bold ${
                    low
                      ? isDarkMode
                        ? "text-amber-400"
                        : "text-amber-600"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-900"
                  }`}
                >
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {low ? <AlertTriangle className="h-4 w-4" /> : null}
                    {row.remainingQty}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StockBalanceTable;
