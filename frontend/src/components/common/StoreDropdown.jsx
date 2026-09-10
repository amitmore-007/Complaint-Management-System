import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Plus } from "lucide-react";

const StoreDropdown = ({
  isDarkMode,
  options,
  value,
  onChange,
  placeholder = "Select a store",
  compact = false,
  inputClassName = "",
  // Lets the caller offer "add this as a new store" when the typed name
  // matches nothing in `options`. Must return the created store (or throw).
  onCreateOption,
  creatingOption = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const sortedOptions = useMemo(() => {
    const safeOptions = Array.isArray(options) ? options : [];
    return [...safeOptions].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" }),
    );
  }, [options]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const currentValue = String(value || "")
      .trim()
      .toLowerCase();

    if (open && q === currentValue) return sortedOptions;

    if (!q) return sortedOptions;
    return sortedOptions.filter((name) =>
      String(name).toLowerCase().includes(q),
    );
  }, [query, sortedOptions, open, value]);

  const trimmedQuery = query.trim();
  const hasExactMatch = sortedOptions.some(
    (name) => String(name).toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const showCreateOption =
    Boolean(onCreateOption) && trimmedQuery.length > 0 && !hasExactMatch;

  const handleCreate = async () => {
    if (!onCreateOption || creatingOption) return;
    try {
      const created = await onCreateOption(trimmedQuery);
      const name = created?.name || trimmedQuery;
      onChange?.(name);
      setQuery(name);
      setOpen(false);
      setActiveIndex(-1);
    } catch {
      // onCreateOption already surfaces its own error toast.
    }
  };

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
        setQuery(valueRef.current || "");
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
              Math.min(idx + 1, filteredOptions.length - 1),
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
            if (!picked) {
              if (showCreateOption) handleCreate();
              return;
            }
            onChange?.(picked);
            setQuery(picked);
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        className={`w-full pl-10 pr-10 border rounded-lg text-left transition-all duration-200 ${
          isDarkMode
            ? "bg-[#1a1a1a] border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        } ${compact ? "py-2" : "py-3"} ${inputClassName}`}
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
          className={`absolute left-0 right-0 top-full mt-2 z-50 border rounded-xl overflow-hidden shadow-xl ${
            isDarkMode
              ? "bg-[#111] border-white/10"
              : "bg-white border-gray-200"
          }`}
          role="listbox"
        >
          <div className={`max-h-44 overflow-y-auto ${isDarkMode ? "dark-scrollbar" : ""}`}>
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div
                className={`px-4 py-3 text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
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
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors text-sm ${
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
                  <span>{name}</span>
                  {selected ? (
                    <Check className="h-4 w-4 text-blue-500" />
                  ) : null}
                </button>
              );
            })}

            {showCreateOption && (
              <button
                type="button"
                disabled={creatingOption}
                onClick={handleCreate}
                onMouseEnter={() => setActiveIndex(-1)}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  filteredOptions.length > 0
                    ? isDarkMode
                      ? "border-t border-white/10"
                      : "border-t border-gray-100"
                    : ""
                } ${
                  isDarkMode
                    ? "text-blue-400 hover:bg-white/10"
                    : "text-blue-600 hover:bg-gray-50"
                }`}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {creatingOption
                    ? "Adding store..."
                    : `Add "${trimmedQuery}" as new store`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDropdown;
