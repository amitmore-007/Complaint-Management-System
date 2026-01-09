import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

import { useTheme } from "../../../../context/ThemeContext";
import { useTechniciansAssignedVsResolvedStats } from "../../../../hooks/useStats";

import Card from "./Card";
import DateRangePicker from "./DateRangePicker";
import TechniciansChart from "./TechniciansChart";
import TechnicianTable from "./TechnicianTable";

import {
  addDays,
  firstDayOfMonth,
  firstDayOfNextMonth,
  formatYmd,
  getBrowserTimeZone,
  getIsSmallScreen,
  monthToExclusiveTo,
  monthToFrom,
  pad2,
  yearToExclusiveTo,
  yearToFrom,
} from "../../../../utils/helpers";

const TechniciansReportCard = () => {
  const { isDarkMode } = useTheme();

  const tz = useMemo(() => getBrowserTimeZone(), []);

  const isSmallScreen = useMemo(() => getIsSmallScreen(), []);
  const chartRenderer = useMemo(
    () => (isSmallScreen ? "svg" : "canvas"),
    [isSmallScreen]
  );

  const now = useMemo(() => new Date(), []);
  const defaultMonth = useMemo(() => {
    const d = firstDayOfMonth(now);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }, [now]);

  const [filters, setFilters] = useState(() => {
    const start = firstDayOfMonth(now);
    const end = new Date(
      firstDayOfNextMonth(now).getTime() - 24 * 60 * 60 * 1000
    );

    return {
      interval: "day",
      day: {
        from: formatYmd(start),
        to: formatYmd(end),
      },
      month: {
        from: defaultMonth,
        to: defaultMonth,
      },
      year: {
        from: String(now.getFullYear()),
        to: String(now.getFullYear()),
      },
    };
  });

  const [appliedQuery, setAppliedQuery] = useState(null);

  // Note: matches previous behavior (endpoint only used from/to/tz)
  const query = useMemo(() => {
    const interval = filters?.interval || "day";

    if (interval === "day") {
      return {
        from: filters?.day?.from,
        to: addDays(filters?.day?.to, 1),
        tz,
      };
    }

    if (interval === "year") {
      return {
        from: yearToFrom(filters?.year?.from),
        to: yearToExclusiveTo(filters?.year?.to),
        tz,
      };
    }

    return {
      from: monthToFrom(filters?.month?.from),
      to: monthToExclusiveTo(filters?.month?.to),
      tz,
    };
  }, [filters, tz]);

  useEffect(() => {
    setAppliedQuery(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsQuery = useTechniciansAssignedVsResolvedStats(appliedQuery, {
    enabled: Boolean(appliedQuery),
  });

  const rows = statsQuery.data?.data || [];
  const loading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching;

  useEffect(() => {
    if (statsQuery.error) {
      console.error(statsQuery.error);
      toast.error("Failed to load technician stats");
    }
  }, [statsQuery.error]);

  const chartOption = useMemo(() => {
    const names = rows.map((r) => r.technicianName);
    const assigned = rows.map((r) => r.assigned);
    const resolved = rows.map((r) => r.resolved);

    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
    const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
    const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";

    return {
      backgroundColor: "transparent",
      textStyle: {
        color: isDarkMode ? "#f9fafb" : "#111827",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        textBorderWidth: 0,
      },
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: isDarkMode
          ? "rgba(17,24,39,0.98)"
          : "rgba(255,255,255,0.98)",
        borderColor: isDarkMode ? "#475569" : "#e5e7eb",
        borderWidth: 1.5,
        textStyle: {
          color: isDarkMode ? "#f9fafb" : "#111827",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
          fontWeight: 500,
        },
        formatter: (params) => {
          return `<div style="padding: 4px 0;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${params.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${params.color}; border-radius: 2px;"></span>
              <span style="font-weight: 600;">${params.seriesName}:</span>
              <span style="font-weight: 700; color: ${params.color};">${params.value}</span>
            </div>
          </div>`;
        },
      },
      legend: {
        top: 0,
        textStyle: {
          color: isDarkMode ? "#e5e7eb" : "#374151",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: 600,
          fontSize: 13,
        },
      },
      grid: {
        left: 40,
        right: 40,
        top: 45,
        bottom: 28,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
        splitLine: { lineStyle: { color: splitLineColor, width: 1 } },
        axisLabel: {
          color: axisLabelColor,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisLabel: {
          color: axisLabelColor,
          hideOverlap: true,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          formatter: (value) => {
            if (!isSmallScreen) return value;
            const s = String(value ?? "");
            return s.length > 14 ? `${s.slice(0, 14)}…` : s;
          },
        },
      },
      series: [
        {
          name: "Assigned",
          type: "bar",
          barWidth: 20,
          barMaxWidth: 24,
          itemStyle: {
            color: "#6366f1",
            borderRadius: [8, 8, 8, 8],
          },
          label: {
            show: true,
            position: "right",
            color: isDarkMode ? "#e5e7eb" : "#374151",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 5,
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(99, 102, 241, 0.5)",
            },
          },
          data: assigned,
        },
        {
          name: "Resolved",
          type: "bar",
          barWidth: 20,
          barMaxWidth: 24,
          itemStyle: {
            color: "#10b981",
            borderRadius: [8, 8, 8, 8],
          },
          label: {
            show: true,
            position: "right",
            color: isDarkMode ? "#e5e7eb" : "#374151",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 5,
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(16, 185, 129, 0.5)",
            },
          },
          data: resolved,
        },
      ],
      media: [
        {
          query: { maxWidth: 480 },
          option: {
            grid: {
              left: 16,
              right: 16,
              top: 55,
              bottom: 28,
            },
            legend: {
              top: 4,
              textStyle: {
                fontSize: 11,
              },
            },
            yAxis: {
              axisLabel: {
                fontSize: 11,
                width: 100,
                overflow: "truncate",
                ellipsis: "…",
              },
            },
            xAxis: {
              axisLabel: {
                fontSize: 10,
              },
            },
            series: [
              { barWidth: 14, label: { fontSize: 9, distance: 4 } },
              { barWidth: 14, label: { fontSize: 9, distance: 4 } },
            ],
          },
        },
      ],
    };
  }, [rows, isDarkMode, isSmallScreen]);

  return (
    <Card isDarkMode={isDarkMode}>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2
              className={`text-xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Technicians: Assigned vs Resolved
            </h2>
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } text-sm`}
            >
              Totals for the selected date range
            </p>
          </div>

          <button
            onClick={() => statsQuery.refetch()}
            disabled={isFetching}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
                : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
            } ${isFetching ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <RefreshCcw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <DateRangePicker
          value={filters}
          onChange={setFilters}
          onApply={() => setAppliedQuery(query)}
          disabled={loading}
          timezone={tz}
          isDarkMode={isDarkMode}
        />

        <TechniciansChart
          option={chartOption}
          loading={loading}
          isDarkMode={isDarkMode}
          chartRenderer={chartRenderer}
        />

        <TechnicianTable rows={rows} isDarkMode={isDarkMode} />
      </div>
    </Card>
  );
};

export default TechniciansReportCard;
