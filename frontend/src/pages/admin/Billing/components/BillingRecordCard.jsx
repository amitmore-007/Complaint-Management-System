import React, { useMemo } from "react";
import { Eye } from "lucide-react";

import { formatMoneyINR } from "../../../../utils/helpers";

const BillingRecordCard = ({ record, isDarkMode, onView }) => {
  const total = useMemo(
    () =>
      (record.materials ?? []).reduce(
        (sum, m) => sum + Number(m.quantity || 0) * Number(m.price || 0),
        0
      ),
    [record.materials]
  );

  return (
    <div
      className={`p-5 rounded-2xl border shadow-sm ${
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p
            className={`${
              isDarkMode ? "text-white" : "text-gray-900"
            } font-bold text-lg`}
          >
            {record.technician?.name ?? "Technician"}
          </p>
          <p
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } text-sm`}
          >
            {record.complaint?.complaintId} • {record.complaint?.title}
          </p>
          <p
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } text-sm`}
          >
            <span className="font-semibold">Location:</span>{" "}
            {record.complaint?.location}
          </p>
          <p
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } text-sm line-clamp-2`}
          >
            {record.complaint?.description}
          </p>
        </div>

        <button
          onClick={onView}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${
            isDarkMode
              ? "border-gray-800 text-gray-200 hover:bg-gray-800"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={`p-3 rounded-2xl border ${
            isDarkMode
              ? "bg-gray-950 border-gray-800"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } text-xs`}
          >
            Materials used
          </p>
          <p
            className={`${
              isDarkMode ? "text-white" : "text-gray-900"
            } font-bold`}
          >
            {record.materialsUsed ? "Yes" : "No"}
          </p>
        </div>

        <div
          className={`p-3 rounded-2xl border ${
            isDarkMode
              ? "bg-gray-950 border-gray-800"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } text-xs`}
          >
            Total
          </p>
          <p
            className={`${
              isDarkMode ? "text-white" : "text-gray-900"
            } font-bold`}
          >
            {formatMoneyINR(total)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillingRecordCard;
