import React from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import InventoryItemPicker from "./InventoryItemPicker";

// Resolution-time material selection: technician picks inventory items
// (by searchable dropdown) and quantity only — price/rate is resolved server-side
// from the inventory catalog and is never sent to or shown in this UI.
const MaterialsUsedFields = ({
  isDarkMode,
  materialsUsed,
  materials,
  inventoryItems,
  onToggleUsed,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}) => {
  const fieldClass = `px-3 py-2 rounded-xl border text-sm ${
    isDarkMode
      ? "bg-white/10 border-white/10 text-white"
      : "bg-white border-gray-200 text-gray-900"
  }`;

  return (
    <div>
      <label
        className={`block text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        Materials Used
      </label>

      <div className="flex items-center gap-4 mb-3">
        <label
          className={`flex items-center gap-2 text-sm font-medium ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <input
            type="radio"
            checked={materialsUsed === true}
            onChange={() => onToggleUsed(true)}
          />
          Yes
        </label>
        <label
          className={`flex items-center gap-2 text-sm font-medium ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <input
            type="radio"
            checked={materialsUsed === false}
            onChange={() => onToggleUsed(false)}
          />
          No
        </label>
      </div>

      {materialsUsed ? (
        inventoryItems.length === 0 ? (
          <div
            className={`p-4 rounded-2xl border text-sm ${
              isDarkMode
                ? "bg-white/5 border-white/10 text-gray-300"
                : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            No inventory items available yet — contact admin to add items
            before recording materials.
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((m) => {
              const selectedItem = inventoryItems.find(
                (item) => item.itemId === m.itemId
              );
              const outOfStock =
                selectedItem && (selectedItem.remainingQty ?? 0) <= 0;

              return (
                <div key={m.rowId}>
                  <div className="flex items-center gap-2">
                    <InventoryItemPicker
                      isDarkMode={isDarkMode}
                      items={inventoryItems}
                      value={m.itemId}
                      onChange={(itemId) => onUpdateRow(m.rowId, { itemId })}
                    />
                    <input
                      type="number"
                      value={m.quantity}
                      onChange={(e) =>
                        onUpdateRow(m.rowId, { quantity: e.target.value })
                      }
                      placeholder="Qty"
                      className={`${fieldClass} w-20 flex-shrink-0`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveRow(m.rowId)}
                      className={`p-2 rounded-xl border flex-shrink-0 ${
                        isDarkMode
                          ? "border-white/10 text-red-300 hover:bg-white/5"
                          : "border-gray-200 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {outOfStock ? (
                    <p
                      className={`mt-1 text-xs flex items-center gap-1 ${
                        isDarkMode ? "text-amber-400" : "text-amber-600"
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {selectedItem.itemName} shows 0 remaining in stock —
                      double-check with admin before using it.
                    </p>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              onClick={onAddRow}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                isDarkMode
                  ? "border-white/10 text-gray-200 hover:bg-white/5"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Plus className="h-4 w-4" />
              Add material
            </button>
          </div>
        )
      ) : null}
    </div>
  );
};

export default MaterialsUsedFields;
