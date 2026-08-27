import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["es"],
    },
    minify: "terser",
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    terserOptions: {
      compress: {
        evaluate: false,
        passes: 3,
      },
      format: {
        comments: false,
      },
      mangle: {
        toplevel: true,
      },
      module: true,
    },
  },
});
