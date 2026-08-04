import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import "dotenv/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js strips this import at build time via its own bundler;
      // outside of Next's compiler it just throws, so no-op it for tests.
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // React Email's render() (used by any test that exercises an
    // EmailService send path) is slow enough on cold start to blow past the
    // 5s default, especially in tests that trigger several sends in one
    // case — bump the default rather than annotate every such test.
    testTimeout: 20000,
  },
});
