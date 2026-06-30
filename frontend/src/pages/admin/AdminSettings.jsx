import React, { useState } from "react";
import {
  Zap,
  Bell,
  Phone,
  User,
  CheckCircle,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  useComplaintAutoAssignSetting,
  useUpdateComplaintAutoAssignSetting,
  useResolvedNotifyContacts,
  useUpdateResolvedNotifyContacts,
} from "../../hooks/useComplaints";

const SettingCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}) => {
  const { isDarkMode } = useTheme();
  return (
    <div
      className={`rounded-2xl border p-6 transition-colors ${
        isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
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

  // Notification contacts
  const { data: savedContacts = [], isLoading: isLoadingContacts } =
    useResolvedNotifyContacts();
  const updateContactsMutation = useUpdateResolvedNotifyContacts();

  // New contact form state
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");

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

  const handleAddContact = async () => {
    const phone = newPhone.trim();
    const name = newName.trim();
    if (!phone) return;
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    if (savedContacts.some((c) => c.phone === phone)) {
      toast.error("This number is already in the list");
      return;
    }
    try {
      await updateContactsMutation.mutateAsync([
        ...savedContacts,
        { phone, name },
      ]);
      setNewPhone("");
      setNewName("");
      toast.success("Contact added");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to add contact",
      );
    }
  };

  const handleRemoveContact = async (phone) => {
    try {
      await updateContactsMutation.mutateAsync(
        savedContacts.filter((c) => c.phone !== phone),
      );
      toast.success("Contact removed");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to remove contact",
      );
    }
  };

  const inputClass = `w-full px-3.5 py-2.5 text-sm border rounded-lg transition-all duration-200 ${
    isDarkMode
      ? "bg-white/10 border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  } disabled:opacity-50`;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isDarkMode ? "bg-white/10" : "bg-gray-100"
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

          <div
            className={`mt-4 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              autoAssignEnabled
                ? isDarkMode
                  ? "bg-blue-900/20 text-blue-400"
                  : "bg-blue-50 text-blue-600"
                : isDarkMode
                  ? "bg-white/10 text-gray-500"
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

        {/* Resolution Notification Contacts */}
        <SettingCard
          icon={Bell}
          iconBg={isDarkMode ? "bg-amber-900/40" : "bg-amber-50"}
          iconColor={isDarkMode ? "text-amber-400" : "text-amber-600"}
          title="Resolution Notification Contacts"
          description="These people receive a WhatsApp message every time a complaint is resolved. You can add multiple contacts."
        >
          <div className="space-y-3">
            {/* Saved contacts list */}
            {isLoadingContacts ? (
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Loading…
              </p>
            ) : savedContacts.length === 0 ? (
              <div
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  isDarkMode
                    ? "bg-white/10 text-gray-500"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Bell className="h-3.5 w-3.5 flex-shrink-0" />
                <span>No contacts added yet. Add one below.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {savedContacts.map((contact) => (
                  <li
                    key={contact.phone}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                      isDarkMode
                        ? "bg-amber-900/20 text-amber-300"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {contact.name ? (
                          <>
                            <strong>{contact.name}</strong> · {contact.phone}
                          </>
                        ) : (
                          contact.phone
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(contact.phone)}
                      disabled={updateContactsMutation.isPending}
                      className={`flex-shrink-0 p-1 rounded-md transition-colors disabled:opacity-50 ${
                        isDarkMode
                          ? "hover:bg-red-900/40 text-red-400"
                          : "hover:bg-red-100 text-red-500"
                      }`}
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add new contact form */}
            <div
              className={`rounded-lg border p-3 space-y-3 ${
                isDarkMode ? "border-white/10" : "border-gray-200"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Add contact
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    disabled={isLoadingContacts}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
                    placeholder="e.g. Rajesh Kumar"
                    disabled={isLoadingContacts}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddContact}
                  disabled={
                    !newPhone.trim() ||
                    updateContactsMutation.isPending ||
                    isLoadingContacts
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateContactsMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        </SettingCard>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
