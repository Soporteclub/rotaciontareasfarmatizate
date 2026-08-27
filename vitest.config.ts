import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Vitest — unit tests only. The source is TypeScript with the `@/*` path alias
// (tsconfig paths). Tests are pure-node (no Next runtime / no DB), so they run
// in the `node` environment and are excluded from tsc (tsconfig `exclude`) and
// eslint (eslint.config.mjs `ignores`).
//
// FIX (PROC-06): `npm run test` runs the suite. Install Vitest with
// `npm i -D vitest`; CI installs it per-job via `npm install --no-save vitest`.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
