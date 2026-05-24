import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "test/**/*.test.ts",
      "test/**/*.spec.ts",
      "packages/**/src/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["**/dist/**", "**/.next/**", "**/test/**"],
    },
  },
});
