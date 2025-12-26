import { DateTime } from "luxon";

const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "UTC";

const parseInterval = (interval) => {
  const normalized = (interval || "month").toString().toLowerCase();
  if (!["day", "month", "year"].includes(normalized)) {
    return "month";
  }
  return normalized;
};

const isDateOnly = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateTimeInZone = (value, tz) => {
  if (!value) return null;

  // If user passes YYYY-MM-DD, interpret as start of day in tz.
  if (isDateOnly(value)) {
    return DateTime.fromISO(value, { zone: tz }).startOf("day");
  }

  // Otherwise accept ISO date-time; if no zone is included, treat it as tz.
  const dt = DateTime.fromISO(value, { setZone: true });
  if (!dt.isValid) return null;

  if (dt.zoneName === "UTC" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    // No offset info provided; interpret as tz
    return DateTime.fromISO(value, { zone: tz });
  }

  return dt.setZone(tz);
};

export const getStatsRange = ({ from, to, tz }) => {
  const timezone = (tz || DEFAULT_TIMEZONE).toString();

  const now = DateTime.now().setZone(timezone);

  let fromDt = parseDateTimeInZone(from, timezone);
  let toDt = parseDateTimeInZone(to, timezone);

  // Default: current calendar month [startOfMonth, startOfNextMonth)
  if (!fromDt && !toDt) {
    fromDt = now.startOf("month");
    toDt = now.plus({ months: 1 }).startOf("month");
  }

  // If only from is provided, default to one month window
  if (fromDt && !toDt) {
    toDt = fromDt.plus({ months: 1 });
  }

  // If only to is provided, default from to one month before
  if (!fromDt && toDt) {
    fromDt = toDt.minus({ months: 1 });
  }

  if (!fromDt?.isValid || !toDt?.isValid) {
    const err = new Error(
      "Invalid from/to date. Use YYYY-MM-DD or ISO date-time."
    );
    err.status = 400;
    throw err;
  }

  if (toDt <= fromDt) {
    const err = new Error("Invalid date range: 'to' must be after 'from'.");
    err.status = 400;
    throw err;
  }

  return {
    timezone,
    from: fromDt.toUTC().toJSDate(),
    to: toDt.toUTC().toJSDate(),
    fromISO: fromDt.toISO(),
    toISO: toDt.toISO(),
  };
};

export const getIntervalAndRange = ({ interval, from, to, tz }) => {
  const parsedInterval = parseInterval(interval);
  const range = getStatsRange({ from, to, tz });
  return {
    interval: parsedInterval,
    ...range,
  };
};
