import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
      thresholds: {
        perFile: true,
        lines: 100,
      },
    },
  },
});
