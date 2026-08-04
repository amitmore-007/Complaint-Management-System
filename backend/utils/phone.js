// Single source of truth for phone normalization. This was previously copy-pasted
// identically into adminController, clientController and technicianController —
// except the admin copy was never actually applied, so admin records could be
// stored with a country-code prefix that normalized lookups would then miss.
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  let cleaned = String(phoneNumber).replace(/\D/g, "");

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.length === 10) {
    return cleaned;
  }

  return phoneNumber;
};
