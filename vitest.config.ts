import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": `${root}/src`,
      // `server-only` throws unless the bundler resolves it under the
      // `react-server` export condition, which only Next does. Tests import
      // server modules directly, so they get the no-op the condition would
      // have selected. The guard still holds where it matters: `next build`.
      "server-only": `${root}/node_modules/server-only/empty.js`,
    },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./tests/vitest.setup.ts"],
          include: ["tests/**/*.test.tsx"],
        },
      },
      {
        // Route handlers and server code run on Node. jsdom's File/Blob live in
        // a different realm from undici's, so `file instanceof File` inside a
        // Route Handler is false under jsdom.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: [
        "src/lib/**",
        "src/server/**",
        "src/actions/**",
        "src/app/api/**",
      ],
      exclude: [
        "src/server/ai/**",
        "src/server/auth.ts",
        "src/lib/auth-client.ts",
      ],
      thresholds: {
        "src/server/admin.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/server/rate-limit.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/server/semantic-skills.ts": {
          statements: 95,
          branches: 85,
          functions: 100,
          lines: 95,
        },
        "src/lib/blob-paths.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/stream-protocol.ts": {
          statements: 95,
          branches: 90,
          functions: 100,
          lines: 95,
        },
        "src/app/api/resumes/route.ts": {
          statements: 90,
          branches: 85,
          functions: 100,
          lines: 90,
        },
      },
    },
  },
});
