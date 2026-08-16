import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { formatMoneyINR } from "../../../../utils/helpers";
import { useAdminStockBalance } from "../../../../hooks/useInventory";

const StockBalanceTable = ({ isDarkMode }) => {
  const stockBalanceQuery = useAdminStockBalance();
  const balances = stockBalanceQuery.data ?? [];

  const totals = useMemo(
    () =>
      balances.reduce(
        (acc, row) => {
          acc.value += row.remainingValue || 0;
          acc.valueWithGst += row.remainingValueWithGst || 0;
          return acc;
        },
        { value: 0, valueWithGst: 0 },
      ),
    [balances],
  );

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
            <th className="text-right px-4 py-3">Avg Rate</th>
            <th className="text-right px-4 py-3">Stock Value</th>
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
                <td
                  className={`px-4 py-3 text-right ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {formatMoneyINR(row.avgUnitRate)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatMoneyINR(row.remainingValue)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr
            className={`border-t-2 ${
              isDarkMode
                ? "border-white/20 text-white"
                : "border-gray-300 text-gray-900"
            }`}
          >
            <td className="px-4 py-3 font-bold" colSpan={5}>
              Total Stock in Hand Value
            </td>
            <td className="px-4 py-3 text-right font-bold">
              {formatMoneyINR(totals.value)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p
        className={`px-4 pb-4 text-xs ${
          isDarkMode ? "text-gray-500" : "text-gray-500"
        }`}
      >
        Valued at weighted average purchase rate, excluding GST. Including GST:{" "}
        <strong>{formatMoneyINR(totals.valueWithGst)}</strong>.
      </p>
    </div>
  );
};

export default StockBalanceTable;
