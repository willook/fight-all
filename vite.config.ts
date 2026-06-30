import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["jindo"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    server: {
      deps: {
        inline: ["@primer/react", "@primer/behaviors", "@primer/react-brand"],
      },
    },
  },
});
