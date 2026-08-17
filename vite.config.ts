import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Pure static SPA — the browser talks to Home Assistant directly over its
// WebSocket API, so there's no backend to proxy to.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
