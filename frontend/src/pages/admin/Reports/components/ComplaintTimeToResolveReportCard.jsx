import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

import { useTheme } from "../../../../context/ThemeContext";
import { useComplaintsTimeToResolveStats } from "../../../../hooks/useStats";

import Card from "./Card";
import DateRangePicker from "./DateRangePicker";
import ComplaintsChart from "./ComplaintsChart";

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

const ComplaintTimeToResolveReportCard = () => {
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

    return {
      interval,
      from: monthToFrom(filters?.month?.from),
      to: monthToExclusiveTo(filters?.month?.to),
      tz,
    };
  }, [filters, tz]);

  useEffect(() => {
    setAppliedQuery(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsQuery = useComplaintsTimeToResolveStats(appliedQuery, {
    enabled: Boolean(appliedQuery),
  });

  const series = statsQuery.data?.data || [];
  const loading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching;

  useEffect(() => {
    if (statsQuery.error) {
      console.error(statsQuery.error);
      toast.error("Failed to load time to resolve");
    }
  }, [statsQuery.error]);

  const option = useMemo(() => {
    const interval = filters?.interval || "day";

    const periods = series.map((d) => d.period);
    const avgHours = series.map((d) => Number(d.avgHours || 0));

    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
    const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
    const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";

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
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 13,
          fontWeight: 500,
        },
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          const period = p?.axisValue ?? p?.name;
          const label = formatPeriodLabel(period, interval);
          const row = series.find((x) => x.period === period);
          const c = Number(row?.count || 0);
          const v = Number(row?.avgHours || 0);

          return `<div style="padding: 4px 0;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${label}</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: #10b981; border-radius: 3px;"></span>
              <span style="font-weight: 600;">Avg hours:</span>
              <span style="font-weight: 700; color: #10b981;">${v.toFixed(
                1
              )}</span>
            </div>
            <div style="margin-top: 4px; color: ${
              isDarkMode ? "#cbd5e1" : "#6b7280"
            }; font-weight: 600;">Resolved: ${c}</div>
          </div>`;
        },
      },
      grid: {
        left: 40,
        right: 30,
        top: 20,
        bottom: interval === "day" ? 70 : 40,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: periods,
        axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisTick: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisLabel: {
          color: axisLabelColor,
          rotate: interval === "day" ? 45 : 0,
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
        name: "Hours",
        nameTextStyle: {
          color: axisLabelColor,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: 600,
        },
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
          name: "Avg hours",
          type: "line",
          smooth: true,
          symbolSize: 7,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 3, color: "#10b981" },
          areaStyle: {
            color: isDarkMode
              ? "rgba(16,185,129,0.12)"
              : "rgba(16,185,129,0.10)",
          },
          data: avgHours,
        },
      ],
    };
  }, [series, isDarkMode, filters?.interval]);

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
              Time to Resolve
            </h2>
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } text-sm`}
            >
              Average resolution time (hours) over the selected range
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

        <ComplaintsChart
          option={option}
          loading={loading}
          isDarkMode={isDarkMode}
          chartRenderer={chartRenderer}
          heightClassName="h-[340px] sm:h-[420px]"
        />
      </div>
    </Card>
  );
};

export default ComplaintTimeToResolveReportCard;
