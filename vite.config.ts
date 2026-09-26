import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

// Extension pages + the background service worker (loaded as an ES module).
// The content script is built separately (vite.content.config.ts) because
// registered content scripts cannot be ES modules and must be one file.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome120",
    rollupOptions: {
      input: {
        popup: resolve(root, "src/popup/index.html"),
        newtab: resolve(root, "src/newtab/index.html"),
        options: resolve(root, "src/options/index.html"),
        background: resolve(root, "src/background/index.ts"),
      },
      output: {
        // The manifest references the service worker by a fixed name.
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
      },
    },
  },
});
