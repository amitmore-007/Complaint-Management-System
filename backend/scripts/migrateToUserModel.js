/**
 * Merges the admins / clients / technicians collections into a single `users`
 * collection carrying a `role` discriminator.
 *
 * SAFETY PROPERTIES
 * - Each document is copied KEEPING ITS ORIGINAL _id. ObjectIds are globally
 *   unique, so there can be no collision, and every existing foreign key
 *   (Complaint.assignedTechnician, BillingRecord.technician, ...) keeps
 *   resolving with zero writes to those documents.
 * - Idempotent: uses $setOnInsert, so re-running never clobbers data that has
 *   changed in `users` since the first run. A second run reports 0 inserted.
 * - Non-destructive: the three source collections are left completely intact.
 *   Rollback is a code revert.
 *
 * Usage:
 *   node scripts/migrateToUserModel.js            # apply
 *   node scripts/migrateToUserModel.js --dry-run  # report only, no writes
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "url";

import connectDB from "../config/database.js";
import Admin from "../models/Admin.js";
import Client from "../models/Client.js";
import Technician from "../models/Technician.js";
import User from "../models/User.js";
import { normalizePhoneNumber } from "../utils/phone.js";

dotenv.config();

const SOURCES = [
  { Model: Admin, role: "admin" },
  { Model: Client, role: "client" },
  { Model: Technician, role: "technician" },
];

/**
 * The old admin auth path stored phoneNumber exactly as the client sent it,
 * while client/technician normalized to 10 digits. The unified auth controller
 * normalizes for every role, so an un-normalized admin row would never be found
 * again and would silently get auto-created as a duplicate on next login.
 * Normalizing here closes that gap — but it can collapse two rows onto the same
 * (phoneNumber, role) key, which the compound unique index rejects. Detect that
 * and refuse to proceed rather than losing an account.
 */
const findNormalizationCollisions = (docs, role) => {
  const byPhone = new Map();

  for (const doc of docs) {
    const key = normalizePhoneNumber(doc.phoneNumber);
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key).push(doc);
  }

  return [...byPhone.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([phone, group]) => ({
      role,
      phone,
      ids: group.map((d) => String(d._id)),
      rawValues: group.map((d) => d.phoneNumber),
    }));
};

const migrateRole = async ({ Model, role }, { dryRun }) => {
  // attendanceToken / attendancePin are `select: false` on the source schemas —
  // a plain find() silently omits them and the attendance portal would break
  // for every migrated user. They must be selected back in explicitly.
  const docs = await Model.find({})
    .select("+attendanceToken +attendancePin")
    .lean();

  if (docs.length === 0) {
    return { role, source: 0, inserted: 0, alreadyPresent: 0 };
  }

  const existingIds = new Set(
    (
      await User.find({ _id: { $in: docs.map((d) => d._id) } })
        .select("_id")
        .lean()
    ).map((d) => String(d._id)),
  );

  const toInsert = docs.filter((d) => !existingIds.has(String(d._id)));

  if (dryRun || toInsert.length === 0) {
    return {
      role,
      source: docs.length,
      inserted: 0,
      alreadyPresent: existingIds.size,
      wouldInsert: toInsert.length,
    };
  }

  const operations = toInsert.map((doc) => {
    // Drop fields that do not exist on the merged model. createdClients /
    // createdTechnicians were write-only arrays; they become User.createdBy,
    // backfilled separately below.
    const { createdClients, createdTechnicians, __v, ...rest } = doc;

    return {
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $setOnInsert: {
            ...rest,
            phoneNumber: normalizePhoneNumber(doc.phoneNumber),
            role,
          },
        },
        upsert: true,
      },
    };
  });

  // Native driver, not the Mongoose model: Mongoose's timestamps:true would
  // add its own $set on updatedAt and conflict with the value we carry over in
  // $setOnInsert. Going direct preserves the source timestamps verbatim.
  const result = await User.collection.bulkWrite(operations, { ordered: false });

  return {
    role,
    source: docs.length,
    inserted: result.upsertedCount ?? 0,
    alreadyPresent: existingIds.size,
  };
};

// Admin.createdClients[] / createdTechnicians[] were never read anywhere, but
// the authorship information is worth preserving as a scalar User.createdBy.
const backfillCreatedBy = async ({ dryRun }) => {
  const admins = await Admin.find({})
    .select("_id createdClients createdTechnicians")
    .lean();

  const createdByOf = new Map();
  for (const admin of admins) {
    for (const id of [
      ...(admin.createdClients ?? []),
      ...(admin.createdTechnicians ?? []),
    ]) {
      if (id) createdByOf.set(String(id), admin._id);
    }
  }

  if (createdByOf.size === 0) return { linked: 0, candidates: 0 };

  // Only set it where it is currently missing, so re-runs are no-ops.
  const missing = await User.find({
    _id: { $in: [...createdByOf.keys()] },
    createdBy: { $exists: false },
  })
    .select("_id")
    .lean();

  if (dryRun || missing.length === 0) {
    return { linked: 0, candidates: missing.length };
  }

  const result = await User.collection.bulkWrite(
    missing.map((user) => ({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { createdBy: createdByOf.get(String(user._id)) } },
      },
    })),
    { ordered: false },
  );

  return { linked: result.modifiedCount ?? 0, candidates: missing.length };
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  if (dryRun) {
    console.log("🔍 DRY RUN — no writes will be performed\n");
  }

  // Pre-flight: refuse to run if normalizing phone numbers would collapse two
  // accounts of the same role onto one key.
  const collisions = [];
  for (const { Model, role } of SOURCES) {
    const docs = await Model.find({}).select("_id phoneNumber").lean();
    collisions.push(...findNormalizationCollisions(docs, role));
  }

  if (collisions.length > 0) {
    console.error(
      "❌ Aborting: phone normalization would collide for these accounts.\n" +
        "   Resolve them manually (deactivate or re-number the duplicates), then re-run.\n",
    );
    for (const c of collisions) {
      console.error(
        `   role=${c.role} normalized=${c.phone}\n` +
          `     raw values : ${c.rawValues.join(", ")}\n` +
          `     _ids       : ${c.ids.join(", ")}`,
      );
    }
    await mongoose.connection.close();
    process.exit(1);
  }

  const results = [];
  for (const source of SOURCES) {
    results.push(await migrateRole(source, { dryRun }));
  }

  const createdByResult = await backfillCreatedBy({ dryRun });

  let sourceTotal = 0;
  for (const r of results) {
    sourceTotal += r.source;
    const action = dryRun
      ? `would insert ${r.wouldInsert}`
      : `inserted ${r.inserted}`;
    console.log(
      `  ${r.role.padEnd(11)} source=${String(r.source).padStart(5)}  ` +
        `${action}, already present ${r.alreadyPresent}`,
    );
  }

  console.log(
    dryRun
      ? `  createdBy   would link ${createdByResult.candidates}`
      : `  createdBy   linked ${createdByResult.linked}`,
  );

  const userTotal = await User.countDocuments({});

  console.log(`\n  source documents total : ${sourceTotal}`);
  console.log(`  users collection total : ${userTotal}`);

  if (!dryRun && userTotal !== sourceTotal) {
    console.warn(
      `\n⚠️  Counts differ by ${Math.abs(userTotal - sourceTotal)}. ` +
        `This is expected only if 'users' already held extra records. Investigate before proceeding.`,
    );
  } else if (!dryRun) {
    console.log("\n✅ Migration complete. Counts reconcile.");
  }

  console.log(
    "\nSource collections were NOT modified. Rollback = revert the code.",
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
