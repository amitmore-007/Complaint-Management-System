import express from "express";

import { authenticateTechnician } from "../middleware/roleAuth.js";
import { listInventoryItemNames } from "../controllers/inventoryController.js";

const router = express.Router();

// Inventory — read-only catalogue for the resolution form
router.get("/inventory/items", authenticateTechnician, listInventoryItemNames);

export default router;
