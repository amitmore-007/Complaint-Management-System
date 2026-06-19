import React, { useState } from "react";
import { Zap, Bell, Phone, User, Save, CheckCircle, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  useComplaintAutoAssignSetting,
  useUpdateComplaintAutoAssignSetting,
  useResolvedNotifyContact,
  useUpdateResolvedNotifyContact,
} from "../../hooks/useComplaints";

const SettingCard = ({ icon: Icon, iconBg, iconColor, title, description, children }) => {
  const { isDarkMode } = useTheme();
  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4 mb-5">
        <div className={`p-3 rounded-xl flex-shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <h3
            className={`font-semibold text-base ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {title}
          </h3>
          <p
            className={`text-sm mt-1 leading-relaxed ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
      <div
        className={`border-t pt-5 ${
          isDarkMode ? "border-gray-700" : "border-gray-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const { isDarkMode } = useTheme();

  // Auto-assign
  const { data: autoAssignEnabled = true, isLoading: isAutoAssignLoading } =
    useComplaintAutoAssignSetting();
  const updateAutoAssignMutation = useUpdateComplaintAutoAssignSetting();

  // Notification contact
  const { data: resolvedNotifyContact, isLoading: isLoadingNotifyContact } =
    useResolvedNotifyContact();
  const updateNotifyContactMutation = useUpdateResolvedNotifyContact();
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyName, setNotifyName] = useState("");
  const [notifyContactEdited, setNotifyContactEdited] = useState(false);

  React.useEffect(() => {
    if (resolvedNotifyContact && !notifyContactEdited) {
      setNotifyPhone(resolvedNotifyContact.phone ?? "");
      setNotifyName(resolvedNotifyContact.name ?? "");
    }
  }, [resolvedNotifyContact, notifyContactEdited]);

  const handleToggleAutoAssign = async () => {
    if (updateAutoAssignMutation.isPending || isAutoAssignLoading) return;
    const nextValue = !autoAssignEnabled;
    try {
      await updateAutoAssignMutation.mutateAsync(nextValue);
      toast.success(
        nextValue
          ? "Auto assign enabled. New complaints will be auto-assigned."
          : "Auto assign disabled. You can now assign complaints manually.",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update auto assign setting",
      );
    }
  };

  const handleSaveNotifyContact = async () => {
    if (updateNotifyContactMutation.isPending) return;
    try {
      await updateNotifyContactMutation.mutateAsync({
        phone: notifyPhone.trim(),
        name: notifyName.trim(),
      });
      setNotifyContactEdited(false);
      toast.success("Notification contact saved successfully");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save notification contact",
      );
    }
  };

  const inputClass = `w-full px-3.5 py-2.5 text-sm border rounded-xl transition-all duration-200 ${
    isDarkMode
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
  } disabled:opacity-50`;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            <Settings
              className={`h-6 w-6 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            />
          </div>
          <div>
            <h1
              className={`text-2xl sm:text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Settings
            </h1>
            <p
              className={`text-sm mt-0.5 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Configure complaint assignment and notification preferences
            </p>
          </div>
        </div>

        {/* Auto Assignment */}
        <SettingCard
          icon={Zap}
          iconBg={isDarkMode ? "bg-blue-900/40" : "bg-blue-50"}
          iconColor={isDarkMode ? "text-blue-400" : "text-blue-600"}
          title="Auto Assignment"
          description="When enabled, new complaints are automatically assigned to the default technician as soon as they are created. Disable this to assign complaints manually."
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-sm font-medium ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                {isAutoAssignLoading
                  ? "Loading…"
                  : autoAssignEnabled
                    ? "Enabled"
                    : "Disabled"}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {autoAssignEnabled
                  ? "Complaints are being auto-assigned"
                  : "Complaints require manual assignment"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoAssign}
              disabled={isAutoAssignLoading || updateAutoAssignMutation.isPending}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                autoAssignEnabled
                  ? "bg-blue-600"
                  : isDarkMode
                    ? "bg-gray-600"
                    : "bg-gray-300"
              }`}
              aria-label="Toggle auto assignment"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  autoAssignEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Status indicator */}
          <div
            className={`mt-4 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              autoAssignEnabled
                ? isDarkMode
                  ? "bg-blue-900/20 text-blue-400"
                  : "bg-blue-50 text-blue-600"
                : isDarkMode
                  ? "bg-gray-700/50 text-gray-400"
                  : "bg-gray-100 text-gray-500"
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {autoAssignEnabled
                ? "New complaints will be assigned automatically on creation."
                : "New complaints will remain pending until manually assigned."}
            </span>
          </div>
        </SettingCard>

        {/* Resolution Notification Contact */}
        <SettingCard
          icon={Bell}
          iconBg={isDarkMode ? "bg-amber-900/40" : "bg-amber-50"}
          iconColor={isDarkMode ? "text-amber-400" : "text-amber-600"}
          title="Resolution Notification Contact"
          description="This person receives a WhatsApp message every time a complaint is resolved. Update this when the responsible person's role changes."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={notifyPhone}
                  onChange={(e) => {
                    setNotifyPhone(e.target.value);
                    setNotifyContactEdited(true);
                  }}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  disabled={isLoadingNotifyContact}
                  className={inputClass}
                />
                <p
                  className={`text-xs mt-1.5 ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  10-digit Indian mobile number
                </p>
              </div>

              <div>
                <label
                  className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Contact Name
                </label>
                <input
                  type="text"
                  value={notifyName}
                  onChange={(e) => {
                    setNotifyName(e.target.value);
                    setNotifyContactEdited(true);
                  }}
                  placeholder="e.g. Rajesh Kumar"
                  disabled={isLoadingNotifyContact}
                  className={inputClass}
                />
                <p
                  className={`text-xs mt-1.5 ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Used in the WhatsApp message greeting
                </p>
              </div>
            </div>

            {/* Current saved value preview */}
            {resolvedNotifyContact?.phone && !notifyContactEdited && (
              <div
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  isDarkMode
                    ? "bg-amber-900/20 text-amber-400"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Currently notifying{" "}
                  <strong>
                    {resolvedNotifyContact.name || "unnamed contact"}
                  </strong>{" "}
                  at <strong>{resolvedNotifyContact.phone}</strong>
                </span>
              </div>
            )}

            {!resolvedNotifyContact?.phone && !notifyContactEdited && (
              <div
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  isDarkMode
                    ? "bg-gray-700/50 text-gray-400"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Bell className="h-3.5 w-3.5 flex-shrink-0" />
                <span>No notification contact set. Add one above.</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveNotifyContact}
                disabled={
                  updateNotifyContactMutation.isPending ||
                  isLoadingNotifyContact ||
                  !notifyContactEdited
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateNotifyContactMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Contact
                  </>
                )}
              </button>
            </div>
          </div>
        </SettingCard>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
