import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// During development the Vite dev server (5173) proxies the config API to the
// Express backend (3001). In production the Express server serves the built
// assets directly, so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
