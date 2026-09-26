import { resolve } from "node:path";
import { defineConfig } from "vite";

// Opt-in site banner content script, bundled as a single classic (IIFE) script.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "chrome120",
    lib: {
      entry: resolve(import.meta.dirname, "src/content/banner.ts"),
      formats: ["iife"],
      name: "AzkarGuardBanner",
      fileName: () => "content.js",
    },
  },
});
