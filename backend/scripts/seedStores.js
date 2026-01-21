import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/database.js";
import { seedStores } from "../utils/seedStores.js";

dotenv.config();

const main = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  const reactivate = process.argv.includes("--reactivate");

  await connectDB();

  const { createdCount, updatedCount, totalAll, totalActive } =
    await seedStores({ reactivate });

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
