/**
 * Makes `complaint.store` authoritative by resolving it from the legacy
 * free-text `complaint.location`.
 *
 * Run scripts/preflightStores.js FIRST and review the unmatched-location list —
 * this script creates a Store for any location string that does not already
 * match one, so typos become real stores if you don't clean them up first.
 *
 * SAFETY PROPERTIES
 * - Idempotent: only touches complaints whose `store` is still unset.
 * - `location` is left untouched, so this is reversible by a code revert.
 * - Store matching is case-insensitive; Store.name is uniquely indexed.
 *
 * Usage:
 *   node scripts/backfillComplaintStores.js --dry-run
 *   node scripts/backfillComplaintStores.js
 *   node scripts/backfillComplaintStores.js --no-create   # only match existing
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "url";

import connectDB from "../config/database.js";
import Complaint from "../models/Complaint.js";
import Store from "../models/Store.js";

dotenv.config();

const lower = (v) => String(v || "").trim().toLowerCase();

/**
 * Location strings that are NOT real stores (free-text addresses, test data).
 * They still need a store because the field is now required, so they go to a
 * single inactive bucket instead of polluting the store dropdowns.
 * Anything not listed here that also has no matching Store becomes a new,
 * active store.
 */
const JUNK_LOCATIONS = new Set([
  "pune",
  "pune, maharashtra, ind",
  "remote",
  "sddssd",
  "ccfhgvjh",
]);

const BUCKET_STORE_NAME = "Unassigned";

const ensureBucketStore = async () => {
  const existing = await Store.findOne({
    name: new RegExp(`^${BUCKET_STORE_NAME}$`, "i"),
  }).select("_id");
  if (existing) return existing._id;

  // isActive:false keeps it out of GET /api/stores dropdowns.
  const created = await Store.create({
    name: BUCKET_STORE_NAME,
    isActive: false,
  });
  return created._id;
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const dryRun = process.argv.includes("--dry-run");
  const noCreate = process.argv.includes("--no-create");

  await connectDB();

  if (dryRun) console.log("🔍 DRY RUN — no writes will be performed\n");

  const missingStore = {
    $and: [
      { $or: [{ store: null }, { store: { $exists: false } }] },
      { location: { $nin: [null, ""] } },
    ],
  };

  const distinct = await Complaint.aggregate([
    { $match: missingStore },
    {
      $group: {
        _id: { $toLower: { $trim: { input: "$location" } } },
        label: { $first: { $trim: { input: "$location" } } },
        count: { $sum: 1 },
      },
    },
  ]);

  if (distinct.length === 0) {
    console.log("✅ Nothing to do — every complaint already has a store ref.");
    await mongoose.connection.close();
    return;
  }

  const stores = await Store.find({}).select("name").lean();
  const storeIdByLower = new Map(stores.map((s) => [lower(s.name), s._id]));

  // Junk location values share one inactive bucket store.
  const junkEntries = distinct.filter(
    (e) => !storeIdByLower.has(e._id) && JUNK_LOCATIONS.has(e._id),
  );

  if (junkEntries.length > 0) {
    const junkCount = junkEntries.reduce((n, e) => n + e.count, 0);
    if (dryRun) {
      console.log(
        `  would bucket ${junkCount} complaint(s) into "${BUCKET_STORE_NAME}" (inactive):`,
      );
      for (const e of junkEntries) {
        console.log(`      ${String(e.count).padStart(5)}x  "${e.label}"`);
      }
    } else {
      const bucketId = await ensureBucketStore();
      for (const e of junkEntries) storeIdByLower.set(e._id, bucketId);
      console.log(
        `  bucketing ${junkCount} complaint(s) into "${BUCKET_STORE_NAME}" (inactive)`,
      );
    }
  }

  // Create a real Store for every remaining unmatched value.
  let created = 0;
  for (const entry of distinct) {
    if (storeIdByLower.has(entry._id)) continue;
    if (JUNK_LOCATIONS.has(entry._id)) continue;

    if (noCreate) {
      console.log(`  skip (no matching Store): "${entry.label}" (${entry.count} complaints)`);
      continue;
    }

    if (dryRun) {
      console.log(`  would create Store: "${entry.label}" (${entry.count} complaints)`);
      created += 1;
      continue;
    }

    try {
      const store = await Store.create({ name: entry.label });
      storeIdByLower.set(entry._id, store._id);
      created += 1;
      console.log(`  created Store: "${entry.label}"`);
    } catch {
      // unique-index race — re-read
      const existing = await Store.findOne({
        name: { $regex: new RegExp(`^${entry.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      }).select("_id");
      if (existing) storeIdByLower.set(entry._id, existing._id);
    }
  }

  // Point complaints at their store.
  let updated = 0;
  for (const entry of distinct) {
    const storeId = storeIdByLower.get(entry._id);
    if (!storeId) continue;

    if (dryRun) {
      updated += entry.count;
      continue;
    }

    const result = await Complaint.updateMany(
      {
        $and: [
          { $or: [{ store: null }, { store: { $exists: false } }] },
          {
            location: {
              $regex: new RegExp(
                `^\\s*${entry.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
                "i",
              ),
            },
          },
        ],
      },
      { $set: { store: storeId } },
    );

    updated += result.modifiedCount ?? 0;
  }

  const remaining = await Complaint.countDocuments(missingStore);

  console.log(
    `\n${dryRun ? "  would create" : "  created"} ${created} store(s)\n` +
      `${dryRun ? "  would update" : "  updated"} ${updated} complaint(s)`,
  );
  if (!dryRun) {
    console.log(`  complaints still lacking a store : ${remaining}`);
    console.log(
      remaining === 0
        ? "\n✅ Every complaint with a location now has a store ref."
        : "\n⚠️  Some complaints still lack a store — re-run preflight to inspect.",
    );
  }
  console.log("\n`location` was NOT modified. Rollback = revert the code.");

  await mongoose.connection.close();
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const run = () =>
  main().catch(async (err) => {
  console.error("❌ Backfill failed:", err);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

if (isDirectRun) run();
