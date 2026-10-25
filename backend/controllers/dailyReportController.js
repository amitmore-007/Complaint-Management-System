import { dailyReportService } from "../services/dailyReportService.js";
import { logHttpError, respondWithError } from "../utils/httpError.js";

/**
 * POST /api/internal/daily-report
 *  - no params : scheduled run. Replies 202 at once so a slow cold start can't
 *                time out the cron; the send finishes in the background.
 *  - ?date=    : send (or skip, if already sent) the report for that IST day.
 *  - ?phone=   : test — send one report to that number only, never claiming
 *                the day, so admins still get the real one.
 */
export const runDailyReport = async (req, res) => {
  const { date, phone } = { ...req.query, ...req.body };

  try {
    if (phone) {
      const result = await dailyReportService.sendTest({ date, phone });
      return res.status(200).json({ success: result.success, result });
    }

    if (date) {
      const result = await dailyReportService.ensureSent(date);
      return res.status(200).json({ success: true, result });
    }

    dailyReportService.runScheduled();
    return res.status(202).json({ success: true, message: "Daily report queued" });
  } catch (error) {
    logHttpError("Daily report error", error);
    return respondWithError(res, error, "Internal server error");
  }
};
