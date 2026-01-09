import React from "react";
import ReactECharts from "echarts-for-react";
import ChartLoader from "./ChartLoader";

const ComplaintsChart = ({
  option,
  loading,
  isDarkMode,
  chartRenderer,
  heightClassName = "h-[340px] sm:h-[420px]",
}) => {
  return (
    <div
      className={`rounded-2xl border ${
        isDarkMode ? "border-gray-800" : "border-gray-200"
      } p-3 relative`}
    >
      {loading && <ChartLoader isDarkMode={isDarkMode} />}
      <div
        className={
          loading ? "opacity-20" : "opacity-100 transition-opacity duration-300"
        }
      >
        <div className={`${heightClassName} w-full`}>
          <ReactECharts
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{
              renderer: chartRenderer,
              devicePixelRatio:
                chartRenderer === "canvas"
                  ? Math.min(
                      typeof window !== "undefined"
                        ? window.devicePixelRatio || 1
                        : 1,
                      2
                    )
                  : undefined,
            }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ComplaintsChart;
