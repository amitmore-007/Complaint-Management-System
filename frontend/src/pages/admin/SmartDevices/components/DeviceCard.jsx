import React from "react";
import { AlertTriangle, Power, Wifi, WifiOff } from "lucide-react";

import { formatNumber, formatTime } from "./format";

const Pill = ({ tone, icon: Icon, children, isDarkMode }) => {
  const tones = {
    green: isDarkMode
      ? "bg-emerald-500/10 text-emerald-300"
      : "bg-emerald-50 text-emerald-700",
    gray: isDarkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600",
    red: isDarkMode ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
};

const Metric = ({ label, value, unit, isDarkMode }) => (
  <div>
    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
      {label}
    </p>
    <p
      className={`text-base font-semibold ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}
    >
      {value}
      <span
        className={`ml-1 text-xs font-normal ${
          isDarkMode ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {unit}
      </span>
    </p>
  </div>
);

const DeviceCard = ({ device, selected, onSelect, isDarkMode }) => {
  const muted = isDarkMode ? "text-gray-400" : "text-gray-600";
  const faults = device.faultLabels ?? [];

  return (
    <button
      type="button"
      onClick={() => onSelect(device.deviceId)}
      className={`text-left w-full p-5 rounded-2xl border transition-colors ${
        isDarkMode ? "bg-[#111]" : "bg-white"
      } ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : isDarkMode
            ? "border-white/10 hover:border-white/25"
            : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          className={`font-semibold leading-snug ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {device.name || device.deviceId}
        </h3>
        <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
          {device.online ? (
            <Pill tone="green" icon={Wifi} isDarkMode={isDarkMode}>
              Online
            </Pill>
          ) : (
            <Pill tone="gray" icon={WifiOff} isDarkMode={isDarkMode}>
              Offline
            </Pill>
          )}
          {device.switchOn !== null && device.switchOn !== undefined && (
            <Pill
              tone={device.switchOn ? "green" : "gray"}
              icon={Power}
              isDarkMode={isDarkMode}
            >
              {device.switchOn ? "ON" : "OFF"}
            </Pill>
          )}
        </div>
      </div>

      <div className={`mt-4 ${device.online ? "" : "opacity-60"}`}>
        <p className={`text-xs ${muted}`}>
          {device.online ? "Power" : "Power (last known)"}
        </p>
        <p
          className={`text-3xl font-bold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {formatNumber(device.power, 1)}
          <span className={`ml-1 text-base font-medium ${muted}`}>W</span>
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric
            label="Voltage"
            value={formatNumber(device.voltage, 1)}
            unit="V"
            isDarkMode={isDarkMode}
          />
          <Metric
            label="Current"
            value={formatNumber(device.current, 2)}
            unit="A"
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      <div
        className={`mt-4 pt-4 border-t grid grid-cols-2 gap-3 ${
          isDarkMode ? "border-white/10" : "border-gray-100"
        }`}
      >
        <Metric
          label="Today"
          value={formatNumber(device.todayKwh, 2)}
          unit="kWh"
          isDarkMode={isDarkMode}
        />
        <Metric
          label="This month"
          value={formatNumber(device.monthKwh, 2)}
          unit="kWh"
          isDarkMode={isDarkMode}
        />
      </div>

      {faults.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {faults.map((label) => (
            <Pill key={label} tone="red" icon={AlertTriangle} isDarkMode={isDarkMode}>
              {label}
            </Pill>
          ))}
        </div>
      )}

      {device.lastSyncError && (
        <p className="mt-3 text-xs text-amber-500">
          Energy sync issue: {device.lastSyncError}
        </p>
      )}

      <p className={`mt-3 text-xs ${muted}`}>
        Checked {formatTime(device.statusSyncedAt)}
      </p>
    </button>
  );
};

export default DeviceCard;
