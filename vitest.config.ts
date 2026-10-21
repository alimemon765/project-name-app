import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,                 // integration files share the local DB and fixture rows
    coverage: { provider: "v8", include: ["src/lib/**"], thresholds: { lines: 80, functions: 80, branches: 80 } },
  },
});
