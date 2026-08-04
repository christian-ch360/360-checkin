import "dotenv/config";
import { defineConfig } from "prisma/config";

// Replaces the deprecated package.json#prisma config block. The datasource
// URL itself still lives in prisma/schema.prisma's own `datasource` block
// (this project uses Prisma's classic engine, not a driver adapter), so
// nothing here needs to duplicate DATABASE_URL/DIRECT_URL — but having a
// prisma.config.ts at all turns off Prisma CLI's automatic .env loading, so
// this file has to load it explicitly or `prisma migrate`/`studio`/etc. lose
// DATABASE_URL. next dev/build are unaffected — Next.js loads .env.local on
// its own, before any Prisma Client code ever runs.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
