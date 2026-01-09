import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

import { useTheme } from "../../../../context/ThemeContext";
import { useComplaintsStoreLeaderboardStats } from "../../../../hooks/useStats";

import Card from "./Card";
import DateRangePicker from "./DateRangePicker";
import ComplaintsChart from "./ComplaintsChart";

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

const ComplaintStoreLeaderboardReportCard = () => {
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

  const rangeQuery = useMemo(() => {
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

  const limit = isSmallScreen ? 10 : 20;
  const query = useMemo(() => ({ ...rangeQuery, limit }), [rangeQuery, limit]);

  useEffect(() => {
    setAppliedQuery(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsQuery = useComplaintsStoreLeaderboardStats(appliedQuery, {
    enabled: Boolean(appliedQuery),
  });

  const rows = statsQuery.data?.data || [];
  const loading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching;

  useEffect(() => {
    if (statsQuery.error) {
      console.error(statsQuery.error);
      toast.error("Failed to load store leaderboard");
    }
  }, [statsQuery.error]);

  const showScrollHint = useMemo(
    () => rows.length > (isSmallScreen ? 6 : 10),
    [rows.length, isSmallScreen]
  );

  const option = useMemo(() => {
    const names = rows.map((r) => r.storeName);
    const total = rows.map((r) => Number(r.total || 0));
    const resolved = rows.map((r) =>
      Number(
        r?.resolved != null
          ? r.resolved
          : Number(r.total || 0) - Number(r.unresolved || 0)
      )
    );
    const unresolved = rows.map((r) => Number(r.unresolved || 0));

    const showDataZoom = names.length > (isSmallScreen ? 6 : 10);

    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
    const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
    const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";

    return {
      backgroundColor: "transparent",
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
        right: 30,
        top: 45,
        bottom: showDataZoom ? 70 : 40,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisTick: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisLabel: {
          color: axisLabelColor,
          hideOverlap: true,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          rotate: showDataZoom ? 25 : 0,
          formatter: (value) => {
            const s = String(value ?? "");
            const max = isSmallScreen ? 10 : 14;
            return s.length > max ? `${s.slice(0, max)}…` : s;
          },
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
      dataZoom: showDataZoom
        ? [
            {
              type: "inside",
              xAxisIndex: 0,
              start: 0,
              end: 100,
            },
            {
              type: "slider",
              xAxisIndex: 0,
              height: 18,
              bottom: 10,
              start: 0,
              end: 100,
              showDetail: false,
              showDataShadow: false,
              brushSelect: false,
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
      series: [
        {
          name: "Total",
          type: "bar",
          barMaxWidth: 26,
          barGap: "20%",
          barCategoryGap: "45%",
          itemStyle: { color: "#3b82f6", borderRadius: [8, 8, 8, 8] },
          label: {
            show: true,
            position: "top",
            color: isDarkMode ? "#e5e7eb" : "#374151",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 5,
          },
          data: total,
        },
        {
          name: "Resolved",
          type: "bar",
          barMaxWidth: 26,
          barGap: "20%",
          barCategoryGap: "45%",
          itemStyle: { color: "#10b981", borderRadius: [8, 8, 8, 8] },
          label: {
            show: true,
            position: "top",
            color: isDarkMode ? "#e5e7eb" : "#374151",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 5,
          },
          data: resolved,
        },
        {
          name: "Unresolved",
          type: "bar",
          barMaxWidth: 26,
          barGap: "20%",
          barCategoryGap: "45%",
          itemStyle: { color: "#f59e0b", borderRadius: [8, 8, 8, 8] },
          label: {
            show: true,
            position: "top",
            color: isDarkMode ? "#e5e7eb" : "#374151",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 5,
          },
          data: unresolved,
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
              Store Leaderboard
            </h2>
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } text-sm`}
            >
              Top stores by complaints created (total / resolved / unresolved)
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
            Tip: drag the slider (or scroll) to view more stores.
          </p>
        ) : null}

        <ComplaintsChart
          option={option}
          loading={loading}
          isDarkMode={isDarkMode}
          chartRenderer={chartRenderer}
          heightClassName="h-[360px] sm:h-[520px]"
        />
      </div>
    </Card>
  );
};

export default ComplaintStoreLeaderboardReportCard;
