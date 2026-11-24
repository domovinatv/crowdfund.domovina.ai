import { defineConfig } from "vitest/config";

// Unit testovi bez mreže i bez Workera (docs/06): čista logika i SQL nad sqlite.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
