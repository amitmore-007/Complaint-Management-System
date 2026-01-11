import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

const StoreDropdown = ({
  isDarkMode,
  options,
  value,
  onChange,
  placeholder = "Select a store",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const sortedOptions = useMemo(() => {
    const safeOptions = Array.isArray(options) ? options : [];
    return [...safeOptions].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );
  }, [options]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedOptions;
    return sortedOptions.filter((name) =>
      String(name).toLowerCase().includes(q)
    );
  }, [query, sortedOptions]);

  useEffect(() => {
    if (!open) {
      setQuery(value || "");
      setActiveIndex(-1);
    }
  }, [value, open]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(value || "");
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
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
            setQuery(value || "");
            setActiveIndex(-1);
            return;
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((idx) =>
              Math.min(idx + 1, filteredOptions.length - 1)
            );
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((idx) => Math.max(idx - 1, 0));
            return;
          }

          if (e.key === "Enter") {
            e.preventDefault();
            const picked =
              activeIndex >= 0
                ? filteredOptions[activeIndex]
                : filteredOptions[0];
            if (!picked) return;
            onChange?.(picked);
            setQuery(picked);
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        className={`w-full pl-10 pr-10 py-3 border rounded-xl text-left transition-all duration-200 ${
          isDarkMode
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
        aria-label="Toggle store list"
      >
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-full mt-2 z-50 border rounded-xl overflow-hidden ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
          role="listbox"
        >
          <div className="max-h-44 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div
                className={`px-4 py-3 text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                No stores found
              </div>
            ) : null}

            {filteredOptions.map((name, idx) => {
              const selected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange?.(name);
                    setQuery(name);
                    setOpen(false);
                    setActiveIndex(-1);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors ${
                    isDarkMode
                      ? "hover:bg-gray-700 text-white"
                      : "hover:bg-gray-50 text-gray-900"
                  } ${
                    idx === activeIndex
                      ? isDarkMode
                        ? "bg-gray-700"
                        : "bg-gray-50"
                      : ""
                  }`}
                >
                  <span>{name}</span>
                  {selected ? (
                    <Check className="h-4 w-4 text-primary-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDropdown;
