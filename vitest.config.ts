import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Gate the pure, fully-testable core at 100% (the fleet "100% on the
      // testable lib" standard). github.ts's network fetch is validated live,
      // not unit-covered; UI/route glue is the irreducible Humble-Object shell.
      include: ["src/lib/activity.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
