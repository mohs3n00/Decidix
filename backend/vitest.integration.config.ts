import { defineConfig } from "vitest/config";

// Batch 2 — real PostgreSQL integration suite.
//
// Unlike the hermetic unit suite, this runs against the local developer
// database from `backend/.env` (or DATABASE_URL in the environment). It creates
// its own uniquely named dataset version, exercises DatasetService
// validate -> ingest -> activate, then removes only what it created.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    // Verified-dataset code paths (not the synthetic fallbacks) must run here.
    env: { NODE_ENV: "development" },
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
