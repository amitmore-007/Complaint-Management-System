import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

const StoreDropdown = ({
  isDarkMode,
  options,
  value,
  onChange,
  placeholder = "Select a store",
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full pl-10 pr-10 py-3 border rounded-xl text-left transition-all duration-200 flex items-center justify-between ${
          isDarkMode
            ? "bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            : "bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "" : "text-gray-500"}>
          {value || placeholder}
        </span>
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
            {options.map((name) => {
              const selected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange?.(name);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors ${
                    isDarkMode
                      ? "hover:bg-gray-700 text-white"
                      : "hover:bg-gray-50 text-gray-900"
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
