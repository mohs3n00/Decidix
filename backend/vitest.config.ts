import { defineConfig } from "vitest/config";

/**
 * Batch 1: the unit/route suite is hermetic and must never read or write the
 * developer database. Before a local PostgreSQL existed, these tests exercised
 * the in-memory fallbacks; now that `decidix_dev` is reachable they would
 * otherwise create real users and sessions on every run.
 *
 * DATABASE_URL is therefore pointed at a loopback port that is not listening,
 * which preserves the suite's original "no live database in tests" contract.
 * Real database behaviour is verified separately against `decidix_dev` by the
 * Batch 1 connectivity/auth probes and by the M1 rehearsal.
 */
export default defineConfig({
  test: {
    // Real PostgreSQL integration tests run separately (vitest.integration.config.ts).
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/integration/**'],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://decidix_test:decidix_test@127.0.0.1:59999/decidix_test",
    },
  },
});
