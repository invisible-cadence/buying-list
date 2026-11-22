import { defineConfig } from "vitest/config";

// The tests run in plain Node. They cover logic that does not need the real
// Workers runtime or a real database.
export default defineConfig({
  test: {
    include: ["worker/**/*.test.ts", "src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
