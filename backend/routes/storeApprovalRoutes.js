import express from "express";

import {
  getStoreApproval,
  respondToStoreApproval,
} from "../controllers/storeApprovalController.js";

const router = express.Router();

// Public: the unguessable link token is the credential (sent only to the
// store contact's WhatsApp).
router.get("/:token", getStoreApproval);
router.post("/:token/respond", respondToStoreApproval);

export default router;
