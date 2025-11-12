import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "../../config/config.js";

/** Shared Prisma client with lifecycle hooks for clean shutdowns. */

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: ["warn", "error"],
});

let didRegisterShutdownHooks = false;

export async function connectToDatabase() {
  try {
    await prisma.$connect();
    registerShutdownHooks();
    console.log("[db] Connected to PostgreSQL");
  } catch (error) {
    console.error("[db] Failed to connect to PostgreSQL:");
    console.error(error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

function registerShutdownHooks() {
  if (didRegisterShutdownHooks) {
    return;
  }

  didRegisterShutdownHooks = true;

  const shutdown = async () => {
    console.log("[db] Disconnecting Prisma client");
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

export { prisma };
