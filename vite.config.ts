import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Identifies this build. Written to version.json and compiled into the
// bundle so a running tablet can notice it is out of date (see
// hooks/useVersionWatcher).
const buildId =
  process.env.GITHUB_SHA?.slice(0, 7) ??
  new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

export default defineConfig({
  // Relative asset paths so the built app runs from any subfolder — e.g.
  // Home Assistant's own /local/dashboard/ (config/www) or a CDN subpath.
  base: "./",
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    {
      name: "emit-version",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ version: buildId }),
        });
      },
    },
  ],
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
