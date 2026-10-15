import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

const itemLabel = (item) => item?.itemName ?? "";

/**
 * Searchable replacement for the inventory <select> in the resolve form:
 * the technician types part of an item name and picks from the matches.
 * Works on itemId, and shows remaining stock beside each option.
 */
const InventoryItemPicker = ({ isDarkMode, items, value, onChange }) => {
  const selectedItem = useMemo(
    () => items.find((item) => item.itemId === value) ?? null,
    [items, value]
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(itemLabel(selectedItem));
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const selectedRef = useRef(selectedItem);

  useEffect(() => {
    selectedRef.current = selectedItem;
  }, [selectedItem]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        itemLabel(a).localeCompare(itemLabel(b), undefined, {
          sensitivity: "base",
        })
      ),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Opening on an already-picked item lists everything, not just itself.
    if (!q || q === itemLabel(selectedItem).toLowerCase()) return sortedItems;
    return sortedItems.filter((item) =>
      itemLabel(item).toLowerCase().includes(q)
    );
  }, [query, sortedItems, selectedItem]);

  useEffect(() => {
    if (!open) {
      setQuery(itemLabel(selectedItem));
      setActiveIndex(-1);
    }
  }, [selectedItem, open]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(itemLabel(selectedRef.current));
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const pick = (item) => {
    onChange(item.itemId);
    setQuery(itemLabel(item));
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Search inventory"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            return;
          }
          if (!open) return;

          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setQuery(itemLabel(selectedItem));
            setActiveIndex(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((idx) => Math.min(idx + 1, filteredItems.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((idx) => Math.max(idx - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const picked =
              activeIndex >= 0 ? filteredItems[activeIndex] : filteredItems[0];
            if (picked) pick(picked);
          }
        }}
        className={`w-full pl-9 pr-9 py-2 rounded-xl border text-sm ${
          isDarkMode
            ? "bg-[#1a1a1a] border-white/10 text-white placeholder-gray-400"
            : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
        }`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
      />

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2"
        aria-label="Toggle inventory list"
      >
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-full mt-1 z-50 border rounded-xl overflow-hidden shadow-xl ${
            isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
          }`}
          role="listbox"
        >
          <div
            className={`max-h-52 overflow-y-auto ${
              isDarkMode ? "dark-scrollbar" : ""
            }`}
          >
            {filteredItems.length === 0 ? (
              <div
                className={`px-4 py-3 text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No items match "{query.trim()}"
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const remaining = item.remainingQty ?? 0;
                return (
                  <button
                    key={item.itemId}
                    type="button"
                    onClick={() => pick(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 text-sm transition-colors ${
                      isDarkMode
                        ? "text-gray-200 hover:bg-white/10"
                        : "text-gray-900 hover:bg-gray-50"
                    } ${
                      idx === activeIndex
                        ? isDarkMode
                          ? "bg-white/10"
                          : "bg-gray-50"
                        : ""
                    }`}
                  >
                    <span className="truncate">{item.itemName}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs ${
                          remaining <= 0
                            ? isDarkMode
                              ? "text-amber-400"
                              : "text-amber-600"
                            : "text-gray-500"
                        }`}
                      >
                        {remaining} left
                      </span>
                      {item.itemId === value ? (
                        <Check className="h-4 w-4 text-blue-500" />
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryItemPicker;
