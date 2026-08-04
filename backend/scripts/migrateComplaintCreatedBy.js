/**
 * Collapses Complaint's three mutually-exclusive creator refs into one
 * `createdBy`:
 *
 *   createdBy = client ?? createdByTechnician ?? createdByAdmin
 *
 * SAFETY PROPERTIES
 * - Verified lossless: exactly one of the three is ever set, always paired with
 *   its `creatorType` discriminator (see the create paths in adminController,
 *   complaintController and technicianController). Admin-raised complaints do
 *   NOT also set `client`.
 * - Additive: the three source fields are left in place. Rollback is a code
 *   revert.
 * - Idempotent: only touches documents where createdBy is still missing.
 *
 * Usage:
 *   node scripts/migrateComplaintCreatedBy.js            # apply
 *   node scripts/migrateComplaintCreatedBy.js --dry-run  # report only
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "url";

import connectDB from "../config/database.js";
import Complaint from "../models/Complaint.js";

dotenv.config();

const BATCH_SIZE = 500;

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  if (dryRun) {
    console.log("🔍 DRY RUN — no writes will be performed\n");
  }

  const pending = { createdBy: { $exists: false } };

  const total = await Complaint.countDocuments(pending);
  console.log(`  complaints needing createdBy : ${total}`);

  if (total === 0) {
    console.log("\n✅ Nothing to do — already migrated.");
    await mongoose.connection.close();
    return;
  }

  // Sanity check before writing: no document should have more than one creator
  // ref set. If any does, the collapse would silently pick one and lose data.
  const conflicting = await Complaint.countDocuments({
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: ["$client", "$createdByTechnician", "$createdByAdmin"],
              cond: { $ne: ["$$this", null] },
            },
          },
        },
        1,
      ],
    },
  });

  if (conflicting > 0) {
    console.error(
      `\n❌ Aborting: ${conflicting} complaint(s) have more than one creator ref set.\n` +
        `   The collapse assumes they are mutually exclusive. Inspect these before proceeding.`,
    );
    await mongoose.connection.close();
    process.exit(1);
  }

  const orphaned = await Complaint.countDocuments({
    ...pending,
    client: null,
    createdByTechnician: null,
    createdByAdmin: null,
  });

  if (orphaned > 0) {
    console.warn(
      `  ⚠️  ${orphaned} complaint(s) have no creator ref at all — they will be left with createdBy unset.`,
    );
  }

  if (dryRun) {
    console.log(`\n  would set createdBy on ${total - orphaned} complaint(s)`);
    await mongoose.connection.close();
    return;
  }

  let processed = 0;
  let modified = 0;

  while (true) {
    const batch = await Complaint.find(pending)
      .select("_id client createdByTechnician createdByAdmin")
      .limit(BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    const operations = batch
      .map((c) => ({
        _id: c._id,
        createdBy: c.client ?? c.createdByTechnician ?? c.createdByAdmin ?? null,
      }))
      .filter((c) => c.createdBy)
      .map((c) => ({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { createdBy: c.createdBy } },
        },
      }));

    if (operations.length === 0) break; // only orphans remain

    const result = await Complaint.bulkWrite(operations, { ordered: false });
    modified += result.modifiedCount ?? 0;
    processed += batch.length;

    console.log(`  ... ${processed}/${total}`);
  }

  console.log(`\n✅ Done. createdBy set on ${modified} complaint(s).`);
  console.log(
    "Source fields (client / createdByTechnician / createdByAdmin) were NOT modified.",
  );

  await mongoose.connection.close();
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const run = () =>
  main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

if (isDirectRun) run();
