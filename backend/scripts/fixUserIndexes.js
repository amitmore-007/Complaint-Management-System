/**
 * Brings the `users` collection's indexes in line with models/User.js.
 *
 * WHY THIS EXISTS
 * A pre-existing `users` collection can carry a single-field UNIQUE index on
 * phoneNumber (left over from an earlier schema). The merged model deliberately
 * allows the same number under different roles — one person can be both a
 * client and a technician — so uniqueness must be the COMPOUND
 * {phoneNumber, role}. The stale index makes the user migration fail with
 * E11000 on any number shared across roles.
 *
 * Only indexes are touched; no document is read or written.
 *
 * Usage:
 *   node scripts/fixUserIndexes.js --dry-run
 *   node scripts/fixUserIndexes.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "url";

import connectDB from "../config/database.js";
import User from "../models/User.js";

dotenv.config();

const DESIRED = [
  {
    name: "phoneNumber_1_role_1",
    key: { phoneNumber: 1, role: 1 },
    options: { unique: true },
  },
  {
    name: "attendanceToken_1",
    key: { attendanceToken: 1 },
    options: { unique: true, sparse: true },
  },
];

// Uniqueness now lives on the compound index; this one is actively wrong.
const OBSOLETE = ["phoneNumber_1"];

const describe = (ix) =>
  `${ix.name} key=${JSON.stringify(ix.key)}` +
  `${ix.unique ? " UNIQUE" : ""}${ix.sparse ? " SPARSE" : ""}`;

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  const dryRun = process.argv.includes("--dry-run");

  await connectDB();
  if (dryRun) console.log("🔍 DRY RUN — no index changes will be made\n");

  const collection = User.collection;
  const existing = await collection.indexes();

  console.log("  current indexes:");
  for (const ix of existing) console.log(`    ${describe(ix)}`);
  console.log("");

  const byName = new Map(existing.map((ix) => [ix.name, ix]));

  for (const name of OBSOLETE) {
    if (!byName.has(name)) continue;

    if (dryRun) {
      console.log(`  would DROP   ${name}`);
    } else {
      await collection.dropIndex(name);
      console.log(`  dropped      ${name}`);
    }
  }

  for (const { name, key, options } of DESIRED) {
    const current = byName.get(name);
    const correct =
      current &&
      Boolean(current.unique) === Boolean(options.unique) &&
      Boolean(current.sparse) === Boolean(options.sparse);

    if (correct) {
      console.log(`  ok           ${name} (already correct)`);
      continue;
    }

    if (dryRun) {
      console.log(
        `  would ${current ? "RECREATE" : "CREATE  "} ${name} ${JSON.stringify(options)}`,
      );
      continue;
    }

    // An index's uniqueness cannot be altered in place — drop and rebuild.
    if (current) await collection.dropIndex(name);
    await collection.createIndex(key, { name, ...options });
    console.log(`  ${current ? "recreated" : "created  "}    ${name}`);
  }

  if (!dryRun) {
    console.log("\n  resulting indexes:");
    for (const ix of await collection.indexes()) {
      console.log(`    ${describe(ix)}`);
    }
    console.log("\n✅ Indexes match models/User.js. No documents were modified.");
  }

  await mongoose.connection.close();
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

const run = () =>
  main().catch(async (err) => {
    console.error("❌ Index fix failed:", err);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore
    }
    process.exit(1);
  });

if (isDirectRun) run();
