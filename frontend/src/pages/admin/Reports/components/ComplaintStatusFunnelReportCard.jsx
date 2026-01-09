import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

import { useTheme } from "../../../../context/ThemeContext";
import { useComplaintsStatusFunnelStats } from "../../../../hooks/useStats";

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

const ComplaintStatusFunnelReportCard = () => {
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

  const statsQuery = useComplaintsStatusFunnelStats(appliedQuery, {
    enabled: Boolean(appliedQuery),
  });

  const data = statsQuery.data?.data || {
    pending: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    total: 0,
  };

  const loading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching;

  useEffect(() => {
    if (statsQuery.error) {
      console.error(statsQuery.error);
      toast.error("Failed to load status funnel");
    }
  }, [statsQuery.error]);

  const option = useMemo(() => {
    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";

    const items = [
      { name: "Pending", value: Number(data?.pending || 0) },
      { name: "Assigned", value: Number(data?.assigned || 0) },
      { name: "In Progress", value: Number(data?.inProgress || 0) },
      { name: "Resolved", value: Number(data?.resolved || 0) },
    ];

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
      series: [
        {
          name: "Status",
          type: "funnel",
          left: "8%",
          top: 10,
          bottom: 10,
          width: "84%",
          min: 0,
          max: Math.max(...items.map((x) => x.value), 1),
          sort: "descending",
          gap: 8,
          label: {
            show: true,
            position: "inside",
            color: "#ffffff",
            fontWeight: 700,
            formatter: (p) => `${p.name}: ${p.value}`,
          },
          labelLine: { show: false },
          itemStyle: {
            borderColor: isDarkMode ? "#0b1220" : "#ffffff",
            borderWidth: 1,
          },
          data: [
            {
              value: items[0].value,
              name: items[0].name,
              itemStyle: { color: "#f59e0b" },
            },
            {
              value: items[1].value,
              name: items[1].name,
              itemStyle: { color: "#6366f1" },
            },
            {
              value: items[2].value,
              name: items[2].name,
              itemStyle: { color: "#3b82f6" },
            },
            {
              value: items[3].value,
              name: items[3].name,
              itemStyle: { color: "#10b981" },
            },
          ],
        },
      ],
      graphic: !items.some((x) => x.value > 0)
        ? [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: "No data for the selected range",
                fill: axisLabelColor,
                fontSize: 13,
                fontFamily:
                  "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 600,
              },
            },
          ]
        : undefined,
    };
  }, [data, isDarkMode]);

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
              Status Funnel
            </h2>
            <p
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } text-sm`}
            >
              Counts in each stage for the selected range
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
          heightClassName="h-[320px] sm:h-[380px]"
        />
      </div>
    </Card>
  );
};

export default ComplaintStatusFunnelReportCard;
