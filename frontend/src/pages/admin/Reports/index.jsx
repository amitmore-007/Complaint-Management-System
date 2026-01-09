import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Filter,
  Hourglass,
  LineChart,
  Timer,
} from "lucide-react";

import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useTheme } from "../../../context/ThemeContext";

import Tabs from "./components/Tabs";
import ComplaintsReportCard from "./components/ComplaintsReportCard";
import TechniciansReportCard from "./components/TechniciansReportCard";
import ComplaintStatusFunnelReportCard from "./components/ComplaintStatusFunnelReportCard";
import ComplaintStoreLeaderboardReportCard from "./components/ComplaintStoreLeaderboardReportCard";
import ComplaintTimeToResolveReportCard from "./components/ComplaintTimeToResolveReportCard";
import ComplaintAgingReportCard from "./components/ComplaintAgingReportCard";

const ReportsPage = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("complaints");

  const tabs = useMemo(
    () => [
      { key: "complaints", label: "Complaints", icon: LineChart },
      { key: "statusFunnel", label: "Status Funnel", icon: Filter },
      { key: "storeLeaderboard", label: "Store Leaderboard", icon: Building2 },
      { key: "timeToResolve", label: "Time to Resolve", icon: Timer },
      { key: "aging", label: "Aging", icon: Hourglass },
      { key: "technicians", label: "Technicians", icon: BarChart3 },
    ],
    []
  );

  const activeTabMeta = useMemo(() => {
    switch (activeTab) {
      case "complaints":
        return {
          title: "Complaints — Created vs Resolved",
          description:
            "Trend of created and resolved complaints for the selected period.",
        };
      case "statusFunnel":
        return {
          title: "Complaints — Status Funnel",
          description:
            "Counts of complaints by status (Pending → Assigned → In Progress → Resolved).",
        };
      case "storeLeaderboard":
        return {
          title: "Complaints — Store Leaderboard",
          description:
            "Top stores by total complaints, with unresolved count for the selected period.",
        };
      case "timeToResolve":
        return {
          title: "Complaints — Time to Resolve",
          description:
            "Average resolution time (hours) for complaints resolved in the selected period.",
        };
      case "aging":
        return {
          title: "Complaints — Aging Buckets",
          description:
            "Open complaints grouped by age (how long they have been unresolved).",
        };
      case "technicians":
        return {
          title: "Technicians",
          description:
            "Technician performance analytics for the selected period.",
        };
      default:
        return { title: "Reports", description: "" };
    }
  }, [activeTab]);

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Reports
            </h1>
          </div>

          <Tabs
            tabs={tabs}
            active={activeTab}
            onChange={setActiveTab}
            isDarkMode={isDarkMode}
          />
        </div>

        <div>
          <h2
            className={`text-lg font-semibold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {activeTabMeta.title}
          </h2>
          {activeTabMeta.description ? (
            <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {activeTabMeta.description}
            </p>
          ) : null}
        </div>

        {/* Keep all mounted so switching tabs is instant */}
        <div className={activeTab === "complaints" ? "block" : "hidden"}>
          <ComplaintsReportCard />
        </div>
        <div className={activeTab === "statusFunnel" ? "block" : "hidden"}>
          <ComplaintStatusFunnelReportCard />
        </div>
        <div className={activeTab === "storeLeaderboard" ? "block" : "hidden"}>
          <ComplaintStoreLeaderboardReportCard />
        </div>
        <div className={activeTab === "timeToResolve" ? "block" : "hidden"}>
          <ComplaintTimeToResolveReportCard />
        </div>
        <div className={activeTab === "aging" ? "block" : "hidden"}>
          <ComplaintAgingReportCard />
        </div>
        <div className={activeTab === "technicians" ? "block" : "hidden"}>
          <TechniciansReportCard />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
