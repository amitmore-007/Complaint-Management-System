export const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const pad2 = (n) => String(n).padStart(2, "0");

export const formatYmd = (date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

export const firstDayOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const firstDayOfNextMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1);

export const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatYmd(dt);
};

export const monthToFrom = (ym) => `${ym}-01`;

// Convert YYYY-MM to an exclusive YYYY-MM-DD boundary (first day of next month)
export const monthToExclusiveTo = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const next = new Date(y, m, 1); // JS month is 0-based; m here is 1-based, so this is next month
  return formatYmd(next);
};

export const yearToFrom = (y) => `${y}-01-01`;
export const yearToExclusiveTo = (y) => `${Number(y) + 1}-01-01`;

export const formatPeriodLabel = (period, interval) => {
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

export const getIsSmallScreen = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 480px)").matches;
};
