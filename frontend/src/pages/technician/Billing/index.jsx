import React, { useMemo, useState } from "react";
import { ClipboardList, FileText } from "lucide-react";

import DashboardLayout from "../../../components/layout/DashboardLayout";
import { useTheme } from "../../../context/ThemeContext";
import { useTechnicianBillingRecords } from "../../../hooks/useBilling";

import Tabs from "./components/Tabs";
import SubmitBillingTab from "./components/SubmitBillingTab";
import SubmittedBillingTab from "./components/SubmittedBillingTab";

const TechnicianBillingIndex = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("submit");

  const submittedQuery = useTechnicianBillingRecords({ page: 1, limit: 50 });

  const tabs = useMemo(
    () => [
      { key: "submit", label: "Submit", icon: FileText },
      { key: "submitted", label: "Submitted Records", icon: ClipboardList },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Billing
          </h1>
          <p
            className={`mt-2 text-sm sm:text-base ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Submit material bills for assigned complaints and track submissions.
          </p>
        </div>

        <Tabs
          tabs={tabs}
          active={activeTab}
          onChange={setActiveTab}
          isDarkMode={isDarkMode}
        />

        {/* Keep all mounted so switching tabs is instant */}
        <div className={activeTab === "submit" ? "block" : "hidden"}>
          <SubmitBillingTab
            isDarkMode={isDarkMode}
            submittedQuery={submittedQuery}
          />
        </div>
        <div className={activeTab === "submitted" ? "block" : "hidden"}>
          <SubmittedBillingTab
            isDarkMode={isDarkMode}
            submittedQuery={submittedQuery}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TechnicianBillingIndex;
