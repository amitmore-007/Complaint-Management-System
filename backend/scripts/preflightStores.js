/**
 * READ-ONLY. Reports what the location -> store migration will have to deal
 * with, before anything is written.
 *
 * Background: `complaint.location` is a free-text string that duplicates
 * `Store.name`, while `complaint.store` (the actual ref) was never populated by
 * any frontend form. This script answers: if we make `store` authoritative, how
 * many complaints need a backfill, and how many carry a location string that
 * matches no known Store?
 *
 * Usage:  node scripts/preflightStores.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "url";

import connectDB from "../config/database.js";
import Complaint from "../models/Complaint.js";
import Store from "../models/Store.js";

dotenv.config();

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  await connectDB();

  const total = await Complaint.countDocuments({});
  const withStore = await Complaint.countDocuments({ store: { $ne: null } });
  const needsBackfill = await Complaint.countDocuments({
    $and: [
      { $or: [{ store: null }, { store: { $exists: false } }] },
      { location: { $nin: [null, ""] } },
    ],
  });
  const unrecoverable = await Complaint.countDocuments({
    $and: [
      { $or: [{ store: null }, { store: { $exists: false } }] },
      { $or: [{ location: null }, { location: "" }] },
    ],
  });

  console.log("\n  COMPLAINTS");
  console.log(`    total                        : ${total}`);
  console.log(`    already have store ref       : ${withStore}`);
  console.log(`    backfillable from location   : ${needsBackfill}`);
  console.log(`    no store AND no location     : ${unrecoverable}`);

  // Which distinct location strings exist, and do they match a Store?
  const locations = await Complaint.aggregate([
    {
      $match: {
        $and: [
          { $or: [{ store: null }, { store: { $exists: false } }] },
          { location: { $nin: [null, ""] } },
        ],
      },
    },
    {
      $group: {
        _id: { $toLower: { $trim: { input: "$location" } } },
        label: { $first: { $trim: { input: "$location" } } },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const stores = await Store.find({}).select("name").lean();
  const storeByLower = new Map(
    stores.map((s) => [String(s.name).trim().toLowerCase(), s]),
  );

  const matched = locations.filter((l) => storeByLower.has(l._id));
  const unmatched = locations.filter((l) => !storeByLower.has(l._id));

  console.log("\n  DISTINCT LOCATION STRINGS (on complaints lacking a store)");
  console.log(`    total distinct               : ${locations.length}`);
  console.log(`    match an existing Store      : ${matched.length}`);
  console.log(`    NO matching Store            : ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(
      "\n  ⚠️  These location values have no Store. The backfill would CREATE" +
        "\n      a Store for each. Review for typos/duplicates first:\n",
    );
    for (const l of unmatched) {
      console.log(`      ${String(l.count).padStart(5)}x  "${l.label}"`);
    }
  }

  console.log(`\n  STORES\n    total in collection          : ${stores.length}`);

  console.log(
    "\n  Nothing was written. Review the above, then run:\n" +
      "    node scripts/backfillComplaintStores.js --dry-run\n",
  );

  await mongoose.connection.close();
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const run = () =>
  main().catch(async (err) => {
  console.error("❌ Preflight failed:", err);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

if (isDirectRun) run();
