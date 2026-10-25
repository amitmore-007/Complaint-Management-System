import { DateTime } from "luxon";
import { complaintData } from "../data/complaintData.js";
import { userData } from "../data/userData.js";
import { systemSettingData } from "../data/systemSettingData.js";
import { sendDailySummary } from "../config/msg91.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { createHttpError } from "../utils/httpError.js";

/**
 * Daily WhatsApp summary to every active admin, covering one finished IST day.
 *
 * Render's free plan sleeps the server, so nothing in-process can be trusted
 * to fire at midnight. Instead every trigger — the external cron hitting the
 * internal endpoint, server start, and a periodic tick while awake — calls
 * ensureSent(), which claims the day atomically. However many triggers fire,
 * each day is sent once; whichever fires first after a miss catches it up.
 */

const TIMEZONE = "Asia/Kolkata";
// Lets anything resolved at 23:59 finish saving before its day is counted.
const SETTLE_MINUTES = 5;
// A "sending" claim this old means the process died mid-run; take it over.
const STALE_CLAIM_MINUTES = 15;
const CATCH_UP_INTERVAL_MS = 30 * 60 * 1000;

const isEnabled = () =>
  String(process.env.DAILY_REPORT_ENABLED || "").toLowerCase() === "true";

/** The latest IST day that has fully ended, as YYYY-MM-DD. */
const lastCompletedDay = () =>
  DateTime.now()
    .setZone(TIMEZONE)
    .minus({ minutes: SETTLE_MINUTES })
    .minus({ days: 1 })
    .toISODate();

const parseDay = (date) => {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ""))
    ? DateTime.fromISO(date, { zone: TIMEZONE })
    : null;
  if (!day?.isValid) throw createHttpError(400, "date must be YYYY-MM-DD");
  return day.startOf("day");
};

const buildSummary = async (date) => {
  const day = parseDay(date);
  const from = day.toJSDate();
  const to = day.plus({ days: 1 }).toJSDate();

  const [raised, resolved, resolvedThisMonth] = await Promise.all([
    complaintData.count({ createdAt: { $gte: from, $lt: to } }),
    complaintData.countResolvedBetween({ from, to }),
    complaintData.countResolvedBetween({
      from: day.startOf("month").toJSDate(),
      to,
    }),
  ]);

  return {
    date: day.toISODate(),
    dateLabel: day.toFormat("d LLL yyyy"),
    raised,
    resolved,
    resolvedThisMonth,
  };
};

/** Active admins, one entry per phone number. */
const listRecipients = async () => {
  const recipients = new Map();
  for (const admin of await userData.listActiveByRole("admin")) {
    const phone = normalizePhoneNumber(admin.phoneNumber);
    if (phone && !recipients.has(phone)) recipients.set(phone, admin.name);
  }
  return recipients;
};

const deliver = async (summary, recipients) => {
  let sent = 0;
  for (const [phone, name] of recipients) {
    const result = await sendDailySummary({
      phoneNumber: phone,
      recipientName: name,
      ...summary,
    });
    if (result.success) sent += 1;
    else console.error(`Daily report to ${phone} failed:`, result.error);
  }
  return sent;
};

/**
 * Send the report for `date` unless it already went out. A run where every
 * message fails is released so the next trigger retries it; a partial success
 * counts as sent, so admins who got it are never messaged twice.
 */
const ensureSent = async (date = lastCompletedDay()) => {
  const day = parseDay(date).toISODate();
  const key = `dailyReport:${day}`;

  const claim = await systemSettingData.claimRun({
    key,
    staleBefore: new Date(Date.now() - STALE_CLAIM_MINUTES * 60 * 1000),
  });
  if (!claim) return { date: day, status: "already-sent" };

  let state = "failed";
  try {
    const recipients = await listRecipients();
    if (recipients.size === 0) {
      console.warn("Daily report: no active admin has a phone number");
      state = "sent";
      return { date: day, status: "no-recipients" };
    }

    const summary = await buildSummary(day);
    const sent = await deliver(summary, recipients);
    if (sent > 0) state = "sent";
    console.log(
      `📊 Daily report ${day}: sent to ${sent}/${recipients.size} admins`,
    );
    return { date: day, status: state, sent, recipients: recipients.size, summary };
  } finally {
    await systemSettingData.finishRun({ key, state });
  }
};

/** Manual check: send one report to one number without claiming the day. */
const sendTest = async ({ date = lastCompletedDay(), phone }) => {
  const summary = await buildSummary(date);
  const result = await sendDailySummary({
    phoneNumber: normalizePhoneNumber(phone),
    recipientName: "Test",
    ...summary,
  });
  return { summary, ...result };
};

/** Entry point for the external cron. Never throws — it runs detached. */
const runScheduled = async () => {
  if (!isEnabled()) return { status: "disabled" };
  try {
    return await ensureSent();
  } catch (error) {
    console.error("Daily report run failed:", error);
    return { status: "error" };
  }
};

export const dailyReportService = { ensureSent, sendTest, runScheduled };

/**
 * Catch-up while the server is awake: on boot (a request has just woken it)
 * and every 30 minutes after. A day already sent is a single cheap lookup.
 */
export const startDailyReportScheduler = () => {
  if (!isEnabled()) {
    console.log("📊 Daily report: disabled (set DAILY_REPORT_ENABLED=true)");
    return;
  }

  runScheduled();
  setInterval(runScheduled, CATCH_UP_INTERVAL_MS).unref();
  console.log("📊 Daily report: catch-up check every 30 min");
};
