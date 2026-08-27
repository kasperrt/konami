import { resolve } from "node:path";

import JavaScriptObfuscator from "javascript-obfuscator";
import { defineConfig, type Plugin } from "vite";

const obfuscate = (): Plugin => {
  return {
    name: "obfuscate",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }

        output.code = JavaScriptObfuscator.obfuscate(output.code, {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 1,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.5,
          identifierNamesGenerator: "hexadecimal",
          numbersToExpressions: true,
          renameGlobals: true,
          reservedNames: ["^konami$"],
          rotateStringArray: true,
          seed: 8675309,
          selfDefending: true,
          shuffleStringArray: true,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 3,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ["rc4"],
          stringArrayIndexShift: true,
          stringArrayThreshold: 1,
          transformObjectKeys: true,
        }).getObfuscatedCode();
      }
    },
  };
};

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["es"],
    },
    minify: true,
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
  plugins: [obfuscate()],
});
