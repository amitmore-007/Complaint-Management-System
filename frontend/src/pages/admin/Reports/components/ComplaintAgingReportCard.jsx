import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

import { useTheme } from "../../../../context/ThemeContext";
import { useComplaintsAgingStats } from "../../../../hooks/useStats";

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

const ComplaintAgingReportCard = () => {
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

  useEffect(() => {
    setAppliedQuery(rangeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsQuery = useComplaintsAgingStats(appliedQuery, {
    enabled: Boolean(appliedQuery),
  });

  const rows = statsQuery.data?.data || [];
  const loading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching;

  useEffect(() => {
    if (statsQuery.error) {
      console.error(statsQuery.error);
      toast.error("Failed to load aging buckets");
    }
  }, [statsQuery.error]);

  const option = useMemo(() => {
    const buckets = rows.map((d) => d.bucket);
    const counts = rows.map((d) => Number(d.count || 0));

    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
    const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
    const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";

    return {
      backgroundColor: "transparent",
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
      },
      grid: {
        left: 40,
        right: 30,
        top: 20,
        bottom: 40,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: buckets,
        axisLine: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisTick: { lineStyle: { color: axisLineColor, width: 1.5 } },
        axisLabel: {
          color: axisLabelColor,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
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
          name: "Open complaints",
          type: "bar",
          barWidth: 22,
          barMaxWidth: 26,
          itemStyle: { color: "#f97316", borderRadius: [8, 8, 4, 4] },
          label: {
            show: true,
            position: "top",
            color: "#f97316",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 8,
          },
          data: counts,
        },
      ],
    };
  }, [rows, isDarkMode]);

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
              Aging (Open Complaints)
            </h2>
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } text-sm`}
            >
              Open complaints bucketed by age
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
          onApply={() => setAppliedQuery(rangeQuery)}
          disabled={loading}
          timezone={tz}
          isDarkMode={isDarkMode}
        />

        <ComplaintsChart
          option={option}
          loading={loading}
          isDarkMode={isDarkMode}
          chartRenderer={chartRenderer}
          heightClassName="h-[300px] sm:h-[360px]"
        />
      </div>
    </Card>
  );
};

export default ComplaintAgingReportCard;
