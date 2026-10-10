import React, { useMemo, useState } from "react";

import Card from "../../Reports/components/Card";
import ComplaintsChart from "../../Reports/components/ComplaintsChart";
import { getIsSmallScreen } from "../../../../utils/helpers";
import {
  useSmartDeviceEnergy,
  useSmartDevicePower,
} from "../../../../hooks/useSmartDevices";
import { formatNumber } from "./format";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

const ENERGY_RANGES = [
  { value: "hour", label: "Last 24 hours" },
  { value: "day", label: "Last 30 days" },
  { value: "month", label: "Last 12 months" },
];

const POWER_RANGES = [
  { value: 24, label: "24 hours" },
  { value: 24 * 7, label: "7 days" },
];

const baseOption = (isDarkMode) => {
  const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
  const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
  const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";
  const axisLabel = { color: axisLabelColor, fontSize: 12, fontFamily: FONT };

  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: isDarkMode
        ? "rgba(17,24,39,0.98)"
        : "rgba(255,255,255,0.98)",
      borderColor: isDarkMode ? "#475569" : "#e5e7eb",
      borderWidth: 1.5,
      textStyle: {
        color: isDarkMode ? "#f9fafb" : "#111827",
        fontFamily: FONT,
        fontSize: 13,
      },
    },
    grid: { left: 16, right: 16, top: 24, bottom: 16, containLabel: true },
    axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
    splitLine: { lineStyle: { color: splitLineColor, width: 1 } },
    axisLabel,
  };
};

const Segmented = ({ options, value, onChange, isDarkMode }) => (
  <div
    className={`inline-flex rounded-lg border p-0.5 ${
      isDarkMode ? "border-white/10 bg-black" : "border-gray-200 bg-gray-50"
    }`}
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
            active
              ? isDarkMode
                ? "bg-white/10 text-white"
                : "bg-white text-gray-900 shadow-sm"
              : isDarkMode
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const SectionHeader = ({ title, subtitle, children, isDarkMode }) => (
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div>
      <h2
        className={`text-lg font-bold ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          {subtitle}
        </p>
      )}
    </div>
    {children}
  </div>
);

const DeviceCharts = ({ device, isDarkMode }) => {
  const chartRenderer = useMemo(
    () => (getIsSmallScreen() ? "svg" : "canvas"),
    []
  );
  const [granularity, setGranularity] = useState("day");
  const [hours, setHours] = useState(24);

  const energyQuery = useSmartDeviceEnergy(device.deviceId, granularity);
  const powerQuery = useSmartDevicePower(device.deviceId, hours);

  const buckets = energyQuery.data?.buckets ?? [];
  const intervals = powerQuery.data ?? [];

  const energyOption = useMemo(() => {
    const base = baseOption(isDarkMode);
    return {
      backgroundColor: base.backgroundColor,
      tooltip: {
        ...base.tooltip,
        valueFormatter: (v) => `${formatNumber(v, 2)} kWh`,
      },
      grid: base.grid,
      xAxis: {
        type: "category",
        data: buckets.map((b) => b.label),
        axisLine: base.axisLine,
        axisTick: { show: false },
        axisLabel: base.axisLabel,
      },
      yAxis: {
        type: "value",
        name: "kWh",
        nameTextStyle: { color: base.axisLabel.color, fontFamily: FONT },
        splitLine: base.splitLine,
        axisLabel: base.axisLabel,
      },
      series: [
        {
          name: "Energy",
          type: "bar",
          barMaxWidth: 26,
          itemStyle: { color: "#3b82f6", borderRadius: [6, 6, 2, 2] },
          data: buckets.map((b) => b.kwh),
        },
      ],
    };
  }, [buckets, isDarkMode]);

  const powerOption = useMemo(() => {
    const base = baseOption(isDarkMode);
    // Step chart: each interval's average applies to the whole span since the
    // previous energy report. Point 0 opens the first interval; point k closes
    // interval k-1, and `step: "start"` draws its value across that span.
    const points = intervals.length
      ? [
          [intervals[0].start, intervals[0].watts],
          ...intervals.map((i) => [i.end, i.watts]),
        ]
      : [];
    const formatAt = (value) =>
      new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

    return {
      backgroundColor: base.backgroundColor,
      tooltip: {
        ...base.tooltip,
        formatter: (params) => {
          const index = params?.[0]?.dataIndex;
          const interval = intervals[Math.max((index ?? 0) - 1, 0)];
          if (!interval) return "";
          return [
            `<b>${formatAt(interval.start)} – ${formatAt(interval.end)}</b>`,
            `Average power: ${formatNumber(interval.watts, 0)} W`,
            `Energy: ${formatNumber(interval.kwh, 3)} kWh`,
          ].join("<br/>");
        },
      },
      grid: base.grid,
      xAxis: {
        type: "time",
        min: Date.now() - hours * 60 * 60 * 1000,
        max: Date.now(),
        axisLine: base.axisLine,
        axisLabel: base.axisLabel,
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: "W",
        nameTextStyle: { color: base.axisLabel.color, fontFamily: FONT },
        splitLine: base.splitLine,
        axisLabel: base.axisLabel,
      },
      series: [
        {
          name: "Average power",
          type: "line",
          step: "start",
          showSymbol: false,
          lineStyle: { color: "#10b981", width: 2 },
          itemStyle: { color: "#10b981" },
          areaStyle: { color: "rgba(16,185,129,0.12)" },
          data: points,
        },
      ],
    };
  }, [intervals, hours, isDarkMode]);

  const muted = isDarkMode ? "text-gray-400" : "text-gray-600";

  return (
    <div className="space-y-6">
      <Card isDarkMode={isDarkMode}>
        <div className="p-4 sm:p-6 space-y-4">
          <SectionHeader
            title="Energy consumption"
            subtitle={`${device.name} · total ${formatNumber(
              energyQuery.data?.totalKwh,
              2
            )} kWh in range`}
            isDarkMode={isDarkMode}
          >
            <Segmented
              options={ENERGY_RANGES}
              value={granularity}
              onChange={setGranularity}
              isDarkMode={isDarkMode}
            />
          </SectionHeader>
          <ComplaintsChart
            option={energyOption}
            loading={energyQuery.isLoading}
            isDarkMode={isDarkMode}
            chartRenderer={chartRenderer}
            heightClassName="h-[280px] sm:h-[340px]"
          />
        </div>
      </Card>

      <Card isDarkMode={isDarkMode}>
        <div className="p-4 sm:p-6 space-y-4">
          <SectionHeader
            title="Average power"
            subtitle="Worked out from the breaker's energy reports (one about every 0.1 kWh)"
            isDarkMode={isDarkMode}
          >
            <Segmented
              options={POWER_RANGES}
              value={hours}
              onChange={setHours}
              isDarkMode={isDarkMode}
            />
          </SectionHeader>
          {!powerQuery.isLoading && intervals.length === 0 ? (
            <div
              className={`h-[200px] flex items-center justify-center text-sm text-center px-6 rounded-2xl border ${
                isDarkMode ? "border-white/10" : "border-gray-200"
              } ${muted}`}
            >
              No energy reports in this range. The breaker was off, offline or
              drawing very little power.
            </div>
          ) : (
            <ComplaintsChart
              option={powerOption}
              loading={powerQuery.isLoading}
              isDarkMode={isDarkMode}
              chartRenderer={chartRenderer}
              heightClassName="h-[260px] sm:h-[320px]"
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default DeviceCharts;
