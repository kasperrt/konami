import { mkdir, rm, writeFile } from "node:fs/promises";

import { build } from "esbuild";
import JavaScriptObfuscator from "javascript-obfuscator";

const outputDirectory = new URL("../dist/", import.meta.url);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const bundle = await build({
  entryPoints: [new URL("../src/index.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: true,
  legalComments: "none",
  write: false,
});

const bundledCode = new TextDecoder().decode(bundle.outputFiles[0].contents);
const obfuscatedCode = JavaScriptObfuscator.obfuscate(bundledCode, {
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

await writeFile(new URL("index.js", outputDirectory), `${obfuscatedCode}\n`);
