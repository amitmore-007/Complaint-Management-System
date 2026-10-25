import crypto from "crypto";
import express from "express";

import { runDailyReport } from "../controllers/dailyReportController.js";

const router = express.Router();

const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();

/**
 * Machine-to-machine routes (external cron), authed by `Authorization: Bearer
 * <CRON_SECRET>`. With no secret configured the routes stay shut rather than
 * open.
 */
const requireCronSecret = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (!secret || !token || !crypto.timingSafeEqual(digest(token), digest(secret))) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return next();
};

router.post("/daily-report", requireCronSecret, runDailyReport);

export default router;
