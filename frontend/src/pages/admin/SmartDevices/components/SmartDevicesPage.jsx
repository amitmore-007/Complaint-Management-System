import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Info,
  PlugZap,
  RefreshCcw,
  Wifi,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useSmartDevices,
  useSyncSmartDevices,
} from "../../../../hooks/useSmartDevices";
import DeviceCard from "./DeviceCard";
import DeviceCharts from "./DeviceCharts";
import { formatNumber, formatTime } from "./format";

const StatCard = ({ icon: Icon, label, value, isDarkMode }) => (
  <div
    className={`p-4 rounded-2xl border flex items-center gap-3 ${
      isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
    }`}
  >
    <div
      className={`p-2.5 rounded-xl ${
        isDarkMode ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-600"
      }`}
    >
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p
        className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
      >
        {label}
      </p>
      <p
        className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  </div>
);

const SmartDevicesPage = ({ isDarkMode }) => {
  const devicesQuery = useSmartDevices();
  const syncMutation = useSyncSmartDevices();
  const [selectedId, setSelectedId] = useState(null);

  const devices = devicesQuery.data?.devices ?? [];
  const syncError = devicesQuery.data?.syncError;
  const apiUsage = devicesQuery.data?.apiUsage;
  const selected =
    devices.find((d) => d.deviceId === selectedId) ?? devices[0] ?? null;

  const summary = useMemo(() => {
    const online = devices.filter((d) => d.online);
    const lastChecked = devices
      .map((d) => d.statusSyncedAt)
      .filter(Boolean)
      .sort()
      .pop();
    return {
      onlineCount: online.length,
      livePower: online.reduce((sum, d) => sum + (d.power || 0), 0),
      todayKwh: devices.reduce((sum, d) => sum + (d.todayKwh || 0), 0),
      monthKwh: devices.reduce((sum, d) => sum + (d.monthKwh || 0), 0),
      lastChecked,
    };
  }, [devices]);

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      if (result.syncError) {
        toast.error("Couldn't reach Tuya — showing last known values");
      } else {
        toast.success("Devices refreshed");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to refresh devices");
    }
  };

  const muted = isDarkMode ? "text-gray-400" : "text-gray-600";

  if (devicesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (devicesQuery.error) {
    return (
      <div
        className={`p-6 rounded-2xl border text-sm ${
          isDarkMode
            ? "bg-[#111] border-white/10 text-gray-300"
            : "bg-white border-gray-200 text-gray-700"
        }`}
      >
        {devicesQuery.error?.response?.data?.message ||
          "Failed to load smart devices."}
      </div>
    );
  }

  const isRefreshing = syncMutation.isPending || devicesQuery.isFetching;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className={`text-sm ${muted}`}>
          Last checked {formatTime(summary.lastChecked)}
        </p>
        <button
          type="button"
          onClick={handleSync}
          disabled={isRefreshing}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors border ${
            isDarkMode
              ? "border-white/10 bg-[#111] text-gray-200 hover:bg-white/10"
              : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
          } ${isRefreshing ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {syncError && (
        <div
          className={`flex items-start gap-2 p-4 rounded-2xl border text-sm ${
            isDarkMode
              ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Couldn&apos;t reach Tuya just now, so these are the last stored
            values. ({syncError})
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wifi}
          label="Devices online"
          value={`${summary.onlineCount} / ${devices.length}`}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={Zap}
          label="Live load"
          value={`${formatNumber(summary.livePower, 0)} W`}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={PlugZap}
          label="Today"
          value={`${formatNumber(summary.todayKwh, 2)} kWh`}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={CalendarDays}
          label="This month"
          value={`${formatNumber(summary.monthKwh, 2)} kWh`}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {devices.map((device) => (
          <DeviceCard
            key={device.deviceId}
            device={device}
            selected={selected?.deviceId === device.deviceId}
            onSelect={setSelectedId}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>

      <div className={`flex items-start gap-2 text-xs ${muted}`}>
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Energy totals are exact (from the breaker&apos;s own usage reports).
          Live power, voltage and current can lag 5–20 minutes while nobody has
          the Smart Life app open, because the breaker reports less often then.
          {apiUsage && (
            <>
              {" "}
              Tuya API calls this month:{" "}
              <span
                className={
                  apiUsage.calls > apiUsage.limit * 0.8
                    ? "font-semibold text-red-500"
                    : "font-semibold"
                }
              >
                {apiUsage.calls.toLocaleString("en-IN")} /{" "}
                {apiUsage.limit.toLocaleString("en-IN")}
              </span>
              .
            </>
          )}
        </span>
      </div>

      {selected && <DeviceCharts device={selected} isDarkMode={isDarkMode} />}
    </div>
  );
};

export default SmartDevicesPage;
