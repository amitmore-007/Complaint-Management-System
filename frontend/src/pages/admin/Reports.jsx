import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { BarChart3, LineChart, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchComplaintsCreatedVsResolvedStats,
  fetchTechniciansAssignedVsResolvedStats,
} from "../../lib/axios";

const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const pad2 = (n) => String(n).padStart(2, "0");

const formatYmd = (date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const firstDayOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);
const firstDayOfNextMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1);

const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatYmd(dt);
};

const monthToFrom = (ym) => `${ym}-01`;
const monthToExclusiveTo = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const next = new Date(y, m, 1); // JS month is 0-based; m here is 1-based, so this is next month
  return formatYmd(next);
};

const yearToFrom = (y) => `${y}-01-01`;
const yearToExclusiveTo = (y) => `${Number(y) + 1}-01-01`;

const formatPeriodLabel = (period, interval) => {
  if (!period) return "";

  // Backend periods are strings: day => YYYY-MM-DD, month => YYYY-MM, year => YYYY
  if (interval === "day") {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(period);
    if (!m) return period;
    // Format as dd/mm/yyyy
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  if (interval === "month") {
    const m = /^([0-9]{4})-([0-9]{2})$/.exec(period);
    if (!m) return period;
    // Format as mm/yyyy for better readability
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = parseInt(m[2], 10) - 1;
    return `${monthNames[monthIndex]} ${m[1]}`;
  }

  // year
  return period;
};

const Tabs = ({ tabs, active, onChange, isDarkMode }) => (
  <div
    className={`inline-flex rounded-2xl p-1 border ${
      isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
    }`}
  >
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            isActive
              ? isDarkMode
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              : isDarkMode
              ? "text-gray-300 hover:bg-gray-800"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </button>
      );
    })}
  </div>
);

const Card = ({ children, isDarkMode }) => (
  <div
    className={`rounded-3xl border shadow-xl ${
      isDarkMode
        ? "bg-gradient-to-b from-gray-900 to-black border-gray-800"
        : "bg-white border-gray-200"
    }`}
  >
    {children}
  </div>
);

const ChartLoader = ({ isDarkMode }) => (
  <div className="absolute inset-0 flex items-center justify-center z-10">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`w-16 h-16 rounded-full border-4 ${
            isDarkMode ? "border-gray-800" : "border-gray-200"
          }`}
        />
        {/* Spinning gradient ring */}
        <div
          className="absolute inset-0 w-16 h-16 rounded-full animate-spin"
          style={{
            background: isDarkMode
              ? "conic-gradient(from 0deg, transparent 0%, #3b82f6 50%, #8b5cf6 100%)"
              : "conic-gradient(from 0deg, transparent 0%, #3b82f6 50%, #4f46e5 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 50%, black 50%, black 55%, transparent 55%)",
            maskImage:
              "radial-gradient(circle, transparent 50%, black 50%, black 55%, transparent 55%)",
          }}
        />
        {/* Inner pulsing dot */}
        <div
          className={`absolute inset-0 m-auto w-3 h-3 rounded-full animate-pulse ${
            isDarkMode
              ? "bg-gradient-to-r from-blue-500 to-purple-500"
              : "bg-gradient-to-r from-blue-600 to-indigo-600"
          }`}
        />
      </div>
      <p
        className={`text-sm font-semibold animate-pulse ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        Loading chart data...
      </p>
    </div>
  </div>
);

const Reports = () => {
  const { isDarkMode } = useTheme();

  const tz = useMemo(() => getBrowserTimeZone(), []);

  const [activeTab, setActiveTab] = useState("complaints");

  // Complaints chart filters
  const [interval, setInterval] = useState("day");
  const now = useMemo(() => new Date(), []);
  const defaultFromMonth = useMemo(() => {
    const d = firstDayOfMonth(now);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }, [now]);

  const defaultToMonth = useMemo(() => {
    const d = firstDayOfMonth(now);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }, [now]);

  const [fromMonth, setFromMonth] = useState(defaultFromMonth);
  const [toMonth, setToMonth] = useState(defaultToMonth);

  const [fromDate, setFromDate] = useState(formatYmd(firstDayOfMonth(now)));
  const [toDate, setToDate] = useState(
    formatYmd(
      new Date(firstDayOfNextMonth(now).getTime() - 24 * 60 * 60 * 1000)
    )
  );

  const [fromYear, setFromYear] = useState(String(now.getFullYear()));
  const [toYear, setToYear] = useState(String(now.getFullYear()));

  const [complaintSeries, setComplaintSeries] = useState([]);
  const [complaintLoading, setComplaintLoading] = useState(false);

  // Technician chart filters
  const [techInterval, setTechInterval] = useState("day");
  const [techFromMonth, setTechFromMonth] = useState(defaultFromMonth);
  const [techToMonth, setTechToMonth] = useState(defaultToMonth);
  const [techFromDate, setTechFromDate] = useState(
    formatYmd(firstDayOfMonth(now))
  );
  const [techToDate, setTechToDate] = useState(
    formatYmd(
      new Date(firstDayOfNextMonth(now).getTime() - 24 * 60 * 60 * 1000)
    )
  );
  const [techFromYear, setTechFromYear] = useState(String(now.getFullYear()));
  const [techToYear, setTechToYear] = useState(String(now.getFullYear()));
  const [techRows, setTechRows] = useState([]);
  const [techLoading, setTechLoading] = useState(false);

  const complaintsQuery = useMemo(() => {
    if (interval === "day") {
      return {
        interval,
        from: fromDate,
        // make UI inclusive by sending exclusive boundary
        to: addDays(toDate, 1),
        tz,
      };
    }

    if (interval === "year") {
      return {
        interval,
        from: yearToFrom(fromYear),
        to: yearToExclusiveTo(toYear),
        tz,
      };
    }

    // month
    return {
      interval,
      from: monthToFrom(fromMonth),
      to: monthToExclusiveTo(toMonth),
      tz,
    };
  }, [interval, fromDate, toDate, fromYear, toYear, fromMonth, toMonth, tz]);

  const techQuery = useMemo(() => {
    if (techInterval === "day") {
      return {
        from: techFromDate,
        to: addDays(techToDate, 1),
        tz,
      };
    }

    if (techInterval === "year") {
      return {
        from: yearToFrom(techFromYear),
        to: yearToExclusiveTo(techToYear),
        tz,
      };
    }

    // month
    return {
      from: monthToFrom(techFromMonth),
      to: monthToExclusiveTo(techToMonth),
      tz,
    };
  }, [
    techInterval,
    techFromDate,
    techToDate,
    techFromYear,
    techToYear,
    techFromMonth,
    techToMonth,
    tz,
  ]);

  const loadComplaintsSeries = async () => {
    try {
      setComplaintLoading(true);
      const res = await fetchComplaintsCreatedVsResolvedStats(complaintsQuery);
      setComplaintSeries(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load complaint stats");
    } finally {
      setComplaintLoading(false);
    }
  };

  const loadTechnicianStats = async () => {
    try {
      setTechLoading(true);
      const res = await fetchTechniciansAssignedVsResolvedStats(techQuery);
      setTechRows(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load technician stats");
    } finally {
      setTechLoading(false);
    }
  };

  useEffect(() => {
    // Load both once on entry so tabs feel instant
    loadComplaintsSeries();
    loadTechnicianStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complaintsChartOption = useMemo(() => {
    const periods = complaintSeries.map((d) => d.period);
    const created = complaintSeries.map((d) => d.created);
    const resolved = complaintSeries.map((d) => d.resolved);

    const axisLabelColor = isDarkMode ? "#d1d5db" : "#6b7280";
    const axisLineColor = isDarkMode ? "#334155" : "#e5e7eb";
    const splitLineColor = isDarkMode ? "#1f2937" : "#f3f4f6";

    const xLabelRotate = interval === "day" ? 45 : 0;
    const gridBottom = interval === "day" ? 70 : 40;

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
          const periodLabel = formatPeriodLabel(params.name, interval);
          return `<div style="padding: 4px 0;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${periodLabel}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${params.color}; border-radius: 50%;"></span>
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
        bottom: gridBottom,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
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
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: "#3b82f6" },
          itemStyle: {
            color: "#3b82f6",
            borderWidth: 2,
            borderColor: "#fff",
          },
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
            scale: true,
            focus: "series",
            itemStyle: {
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: "rgba(59, 130, 246, 0.5)",
            },
          },
          areaStyle: { opacity: 0.08, color: "#3b82f6" },
          data: created,
        },
        {
          name: "Resolved",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: "#10b981" },
          itemStyle: {
            color: "#10b981",
            borderWidth: 2,
            borderColor: "#fff",
          },
          label: {
            show: true,
            position: "bottom",
            color: "#10b981",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            distance: 8,
          },
          emphasis: {
            scale: true,
            focus: "series",
            itemStyle: {
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: "rgba(16, 185, 129, 0.5)",
            },
          },
          areaStyle: { opacity: 0.08, color: "#10b981" },
          data: resolved,
        },
      ],
    };
  }, [complaintSeries, isDarkMode, interval]);

  const techChartOption = useMemo(() => {
    const names = techRows.map((r) => r.technicianName);
    const assigned = techRows.map((r) => r.assigned);
    const resolved = techRows.map((r) => r.resolved);

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
        },
      },
      series: [
        {
          name: "Assigned",
          type: "bar",
          barWidth: 16,
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
          barWidth: 16,
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
    };
  }, [techRows, isDarkMode]);

  const tabs = useMemo(
    () => [
      { key: "complaints", label: "Complaints", icon: LineChart },
      { key: "technicians", label: "Technicians", icon: BarChart3 },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Reports
            </h1>
            <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Complaint and technician performance analytics
            </p>
          </div>

          <Tabs
            tabs={tabs}
            active={activeTab}
            onChange={setActiveTab}
            isDarkMode={isDarkMode}
          />
        </div>

        {activeTab === "complaints" && (
          <Card isDarkMode={isDarkMode}>
            <div className="p-6 space-y-5">
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
                  onClick={loadComplaintsSeries}
                  disabled={complaintLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors border ${
                    isDarkMode
                      ? "border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                  } ${complaintLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${
                      complaintLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl p-4 border ${
                  isDarkMode
                    ? "border-gray-800 bg-black/30"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Interval
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${
                      isDarkMode
                        ? "bg-gray-900 border-gray-800 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                    style={isDarkMode ? { colorScheme: "dark" } : {}}
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>

                {interval === "day" && (
                  <>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        From
                      </label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        To
                      </label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                  </>
                )}

                {interval === "month" && (
                  <>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        From month
                      </label>
                      <input
                        type="month"
                        value={fromMonth}
                        onChange={(e) => setFromMonth(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        To month
                      </label>
                      <input
                        type="month"
                        value={toMonth}
                        onChange={(e) => setToMonth(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                  </>
                )}

                {interval === "year" && (
                  <>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        From year
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={fromYear}
                        onChange={(e) => setFromYear(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        To year
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={toYear}
                        onChange={(e) => setToYear(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-3 flex items-center justify-between gap-3 flex-wrap">
                  <p
                    className={`${
                      isDarkMode ? "text-gray-500" : "text-gray-600"
                    } text-sm`}
                  >
                    Timezone:{" "}
                    <span
                      className={`${
                        isDarkMode ? "text-gray-300" : "text-gray-800"
                      } font-semibold`}
                    >
                      {tz}
                    </span>
                  </p>

                  <button
                    onClick={loadComplaintsSeries}
                    disabled={complaintLoading}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                      isDarkMode
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
                    } ${
                      complaintLoading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div
                className={`rounded-2xl border ${
                  isDarkMode ? "border-gray-800" : "border-gray-200"
                } p-3 relative`}
              >
                {complaintLoading && <ChartLoader isDarkMode={isDarkMode} />}
                <div
                  className={
                    complaintLoading
                      ? "opacity-20"
                      : "opacity-100 transition-opacity duration-300"
                  }
                >
                  <ReactECharts
                    option={complaintsChartOption}
                    style={{ height: 420, width: "100%" }}
                    opts={{ renderer: "canvas" }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "technicians" && (
          <Card isDarkMode={isDarkMode}>
            <div className="p-6 space-y-5">
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
                  onClick={loadTechnicianStats}
                  disabled={techLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors border ${
                    isDarkMode
                      ? "border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
                      : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                  } ${techLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${techLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl p-4 border ${
                  isDarkMode
                    ? "border-gray-800 bg-black/30"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    Interval
                  </label>
                  <select
                    value={techInterval}
                    onChange={(e) => setTechInterval(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${
                      isDarkMode
                        ? "bg-gray-900 border-gray-800 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                    }`}
                    style={isDarkMode ? { colorScheme: "dark" } : {}}
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>

                {techInterval === "day" && (
                  <>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        From
                      </label>
                      <input
                        type="date"
                        value={techFromDate}
                        onChange={(e) => setTechFromDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        To
                      </label>
                      <input
                        type="date"
                        value={techToDate}
                        onChange={(e) => setTechToDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                  </>
                )}

                {techInterval === "month" && (
                  <>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        From month
                      </label>
                      <input
                        type="month"
                        value={techFromMonth}
                        onChange={(e) => setTechFromMonth(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        To month
                      </label>
                      <input
                        type="month"
                        value={techToMonth}
                        onChange={(e) => setTechToMonth(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                        style={isDarkMode ? { colorScheme: "dark" } : {}}
                      />
                    </div>
                  </>
                )}

                {techInterval === "year" && (
                  <>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        From year
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={techFromYear}
                        onChange={(e) => setTechFromYear(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-semibold mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        To year
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={techToYear}
                        onChange={(e) => setTechToYear(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border outline-none ${
                          isDarkMode
                            ? "bg-gray-900 border-gray-800 text-white"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-3 flex items-center justify-between gap-3 flex-wrap">
                  <p
                    className={`${
                      isDarkMode ? "text-gray-500" : "text-gray-600"
                    } text-sm`}
                  >
                    Timezone:{" "}
                    <span
                      className={`${
                        isDarkMode ? "text-gray-300" : "text-gray-800"
                      } font-semibold`}
                    >
                      {tz}
                    </span>
                  </p>

                  <button
                    onClick={loadTechnicianStats}
                    disabled={techLoading}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                      isDarkMode
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
                    } ${techLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div
                className={`rounded-2xl border ${
                  isDarkMode ? "border-gray-800" : "border-gray-200"
                } p-3 relative`}
              >
                {techLoading && <ChartLoader isDarkMode={isDarkMode} />}
                <div
                  className={
                    techLoading
                      ? "opacity-20"
                      : "opacity-100 transition-opacity duration-300"
                  }
                >
                  <ReactECharts
                    option={techChartOption}
                    style={{ height: 520, width: "100%" }}
                    opts={{ renderer: "canvas" }}
                    notMerge={true}
                    lazyUpdate={true}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
