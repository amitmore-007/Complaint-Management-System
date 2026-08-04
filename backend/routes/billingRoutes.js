import express from "express";
import multer from "multer";

import {
  createBillingRecord,
  listBillingRecords,
  getBillingRecord,
  updateBillingRecord,
} from "../controllers/billingController.js";
import {
  authenticateAny,
  authenticateAdmin,
  authenticateTechnician,
} from "../middleware/roleAuth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Listing is shared and role-scoped (technician sees their own submissions,
 * admin sees all). Creating is technician-only and editing is admin-only —
 * those are genuinely different operations, so they keep distinct guards
 * rather than being folded into one handler.
 */
router.get("/", authenticateAny, listBillingRecords);
router.post("/", authenticateTechnician, upload.any(), createBillingRecord);
router.get("/:id", authenticateAdmin, getBillingRecord);
router.put("/:id", authenticateAdmin, updateBillingRecord);

export default router;
