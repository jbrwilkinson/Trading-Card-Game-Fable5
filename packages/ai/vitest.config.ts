import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // Type-only modules and barrel re-exports have no runtime code to cover.
      exclude: ["src/types/**", "src/index.ts"],
      reporter: ["text", "html"],
    },
  },
});
