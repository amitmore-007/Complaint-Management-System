import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/database.js";
import Store from "../models/Store.js";
import { STORE_OPTIONS } from "../config/storeOptions.js";

dotenv.config();

const normalizedKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const ensureStoreExistsByName = async (storeName, { reactivate } = {}) => {
  const name = String(storeName || "").trim();
  if (!name) return { store: null, created: false, updated: false };

  const existing = await Store.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });

  if (existing) {
    if (reactivate && existing.isActive === false) {
      existing.isActive = true;
      await existing.save();
      return { store: existing, created: false, updated: true };
    }

    return { store: existing, created: false, updated: false };
  }

  try {
    const createdStore = await Store.create({ name });
    return { store: createdStore, created: true, updated: false };
  } catch (error) {
    // Race / duplicate key
    const fallback = await Store.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (fallback) return { store: fallback, created: false, updated: false };

    throw error;
  }
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const reactivate = process.argv.includes("--reactivate");

  await connectDB();

  const uniqueNames = Array.from(
    new Map(
      STORE_OPTIONS.map((n) => [normalizedKey(n), String(n).trim()]),
    ).values(),
  ).filter(Boolean);

  let createdCount = 0;
  let updatedCount = 0;

  for (const storeName of uniqueNames) {
    const { created, updated } = await ensureStoreExistsByName(storeName, {
      reactivate,
    });

    if (created) createdCount += 1;
    if (updated) updatedCount += 1;
  }

  const totalActive = await Store.countDocuments({ isActive: true });
  const totalAll = await Store.countDocuments({});

  console.log(
    `✅ Seed complete. Created: ${createdCount}, Reactivated: ${updatedCount}, Total: ${totalAll}, Active: ${totalActive}`,
  );

  await mongoose.connection.close();
};

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
