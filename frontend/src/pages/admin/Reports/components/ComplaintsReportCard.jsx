import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

import { useTheme } from "../../../../context/ThemeContext";
import { useComplaintsCreatedVsResolvedStats } from "../../../../hooks/useStats";

import Card from "./Card";
import DateRangePicker from "./DateRangePicker";
import ComplaintsChart from "./ComplaintsChart";
import ComplaintsSeriesTable from "./ComplaintsSeriesTable";

import {
  addDays,
  firstDayOfMonth,
  firstDayOfNextMonth,
  formatPeriodLabel,
  formatYmd,
  getBrowserTimeZone,
  getIsSmallScreen,
  monthToExclusiveTo,
  monthToFrom,
  pad2,
  yearToExclusiveTo,
  yearToFrom,
} from "../../../../utils/helpers";

const ComplaintsReportCard = () => {
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

  const query = useMemo(() => {
    const interval = filters?.interval || "day";

    if (interval === "day") {
      return {
        interval,
        from: filters?.day?.from,
        // make UI inclusive by sending exclusive boundary
        to: addDays(filters?.day?.to, 1),
        tz,
      };
    }

    if (interval === "year") {
      return {
        interval,
        from: yearToFrom(filters?.year?.from),
        to: yearToExclusiveTo(filters?.year?.to),
        tz,
      };
    }

    // month
    return {
      interval,
      from: monthToFrom(filters?.month?.from),
      to: monthToExclusiveTo(filters?.month?.to),
      tz,
    };
  }, [filters, tz]);

  // Set initial applied query once (so the card loads once on mount, but
  // date picker edits don't auto-refetch until Apply is clicked).
  useEffect(() => {
    setAppliedQuery(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsQuery = useComplaintsCreatedVsResolvedStats(appliedQuery, {
    enabled: Boolean(appliedQuery),
  });

  const series = statsQuery.data?.data || [];
  const loading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching;

  useEffect(() => {
    if (statsQuery.error) {
      console.error(statsQuery.error);
      toast.error("Failed to load complaint stats");
    }
  }, [statsQuery.error]);

  const showScrollHint = useMemo(() => {
    const interval = filters?.interval || "day";
    return interval === "day" && series.length > (isSmallScreen ? 12 : 24);
  }, [filters?.interval, series.length, isSmallScreen]);

  const chartOption = useMemo(() => {
    const interval = filters?.interval || "day";

    const periods = series.map((d) => d.period);
    const created = series.map((d) => d.created);
    const resolved = series.map((d) => d.resolved);

    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
    const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
    const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";

    const showDataZoom =
      interval === "day" && periods.length > (isSmallScreen ? 8 : 12);

    // Default visible window so the chart doesn't look crowded; admins can slide to older days
    // or resize the window to focus on e.g. 3 days.
    const defaultVisibleDays = isSmallScreen ? 7 : 14;
    const endIndex = Math.max(0, periods.length - 1);
    const startIndex = Math.max(0, periods.length - defaultVisibleDays);

    const xLabelRotate = interval === "day" ? 45 : 0;
    const gridBottom = showDataZoom ? 110 : interval === "day" ? 70 : 40;

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
        trigger: "axis",
        axisPointer: { type: "shadow" },
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
          const items = Array.isArray(params) ? params : [params];
          const axisValue = items[0]?.axisValue ?? items[0]?.name;
          const periodLabel = formatPeriodLabel(axisValue, interval);

          const rows = items
            .map((p) => {
              const value = typeof p?.value === "number" ? p.value : p?.value;
              return `<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${p.color}; border-radius: 3px;"></span>
                <span style="font-weight: 600;">${p.seriesName}:</span>
                <span style="font-weight: 700; color: ${p.color};">${value}</span>
              </div>`;
            })
            .join("");

          return `<div style="padding: 4px 0;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${periodLabel}</div>
            ${rows}
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
        bottom: gridBottom,
        containLabel: true,
      },
      dataZoom: showDataZoom
        ? [
            {
              type: "inside",
              xAxisIndex: 0,
              zoomOnMouseWheel: false,
              moveOnMouseWheel: true,
              moveOnMouseMove: true,
              startValue: periods[startIndex],
              endValue: periods[endIndex],
            },
            {
              type: "slider",
              xAxisIndex: 0,
              height: 18,
              bottom: 10,
              startValue: periods[startIndex],
              endValue: periods[endIndex],
              showDetail: false,
              showDataShadow: false,
              brushSelect: false,
              minValueSpan: Math.min(3, periods.length),
              borderColor: isDarkMode ? "#334155" : "#e5e7eb",
              fillerColor: isDarkMode
                ? "rgba(148,163,184,0.25)"
                : "rgba(100,116,139,0.18)",
              backgroundColor: isDarkMode
                ? "rgba(15,23,42,0.6)"
                : "rgba(255,255,255,0.8)",
              dataBackground: {
                lineStyle: {
                  color: isDarkMode
                    ? "rgba(148,163,184,0.35)"
                    : "rgba(100,116,139,0.28)",
                },
                areaStyle: {
                  color: isDarkMode
                    ? "rgba(148,163,184,0.10)"
                    : "rgba(100,116,139,0.08)",
                },
              },
              selectedDataBackground: {
                lineStyle: {
                  color: isDarkMode
                    ? "rgba(226,232,240,0.40)"
                    : "rgba(55,65,81,0.25)",
                },
                areaStyle: {
                  color: isDarkMode
                    ? "rgba(226,232,240,0.08)"
                    : "rgba(55,65,81,0.06)",
                },
              },
              handleSize: 16,
              handleIcon:
                "path://M8.2,2.5h1.6v11H8.2V2.5z M12.2,2.5h1.6v11h-1.6V2.5z",
              handleStyle: {
                color: isDarkMode ? "#94a3b8" : "#64748b",
                borderColor: isDarkMode ? "#475569" : "#cbd5e1",
                borderWidth: 1,
              },
              textStyle: {
                color: isDarkMode ? "#cbd5e1" : "#64748b",
              },
            },
          ]
        : undefined,
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: periods,
        axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisTick: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisLabel: {
          color: axisLabelColor,
          rotate: xLabelRotate,
          margin: 14,
          hideOverlap: true,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          formatter: (value) => formatPeriodLabel(value, interval),
        },
      },
      yAxis: {
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
      series: [
        {
          name: "Created",
          type: "bar",
          barWidth: 20,
          barMaxWidth: 24,
          itemStyle: { color: "#3b82f6", borderRadius: [8, 8, 4, 4] },
          label: {
            show: true,
            position: "top",
            color: "#3b82f6",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 8,
          },
          emphasis: {
            focus: "series",
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(59, 130, 246, 0.5)",
            },
          },
          data: created,
        },
        {
          name: "Resolved",
          type: "bar",
          barWidth: 20,
          barMaxWidth: 24,
          itemStyle: { color: "#10b981", borderRadius: [8, 8, 4, 4] },
          label: {
            show: true,
            position: "top",
            color: "#10b981",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 8,
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
              bottom: showDataZoom ? 130 : interval === "day" ? 90 : 60,
            },
            legend: {
              top: 4,
              textStyle: {
                fontSize: 11,
              },
            },
            xAxis: {
              axisLabel: {
                rotate: interval === "day" ? 60 : 0,
                fontSize: 10,
                margin: 16,
              },
            },
            yAxis: {
              axisLabel: {
                fontSize: 10,
              },
            },
            series: [
              { barWidth: 14, label: { fontSize: 9, distance: 6 } },
              { barWidth: 14, label: { fontSize: 9, distance: 6 } },
            ],
          },
        },
      ],
    };
  }, [series, isDarkMode, filters?.interval, isSmallScreen]);

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
              Complaints: Created vs Resolved
            </h2>
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } text-sm`}
            >
              Grouped by day, month, or year
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

        {showScrollHint ? (
          <p
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } text-xs`}
          >
            Tip: drag the slider (or scroll) to view more days.
          </p>
        ) : null}

        <ComplaintsChart
          option={chartOption}
          loading={loading}
          isDarkMode={isDarkMode}
          chartRenderer={chartRenderer}
        />

        <ComplaintsSeriesTable
          series={series}
          interval={filters?.interval || "day"}
          isDarkMode={isDarkMode}
        />
      </div>
    </Card>
  );
};

export default ComplaintsReportCard;
