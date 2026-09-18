import path from "node:path";
import { defineConfig } from "vitest/config";

// Standalone from vite.config.ts on purpose — keeps the app's own build
// config untouched by test-only settings.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
  },
});
