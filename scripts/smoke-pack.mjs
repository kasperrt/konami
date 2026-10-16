import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const directory = mkdtempSync(join(tmpdir(), "konami-pack-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const [pack] = JSON.parse(
  execFileSync(npm, ["pack", "--json", "--pack-destination", directory], {
    encoding: "utf8",
  }),
);
assert(pack.files.some((file) => file.path === "dist/index.d.ts"));
assert(
  pack.files.every((file) =>
    /^(dist\/|README.md$|LICENSE$|package.json$)/.test(file.path),
  ),
);
writeFileSync(
  join(directory, "package.json"),
  '{"private":true,"type":"module"}',
);
execFileSync(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(directory, pack.filename),
  ],
  { cwd: directory, stdio: "inherit" },
);
writeFileSync(
  join(directory, "smoke.mjs"),
  `
import assert from "node:assert/strict";
import konami, { konami as named } from "@kasperrt/konami";
assert.equal(konami, named);
const target = new EventTarget();
let calls = 0;
const [error, stop] = konami(() => calls++, { target });
assert.equal(error, null);
for (const keyCode of [38,38,40,40,37,39,37,39,66,65]) {
  const event = new Event("keydown");
  Object.defineProperty(event, "keyCode", { value: keyCode });
  target.dispatchEvent(event);
}
assert.equal(calls, 1);
stop();
assert(konami(() => {})[0] instanceof Error);
`,
);
execFileSync(process.execPath, [join(directory, "smoke.mjs")], {
  stdio: "inherit",
});
writeFileSync(
  join(directory, "smoke.ts"),
  `
import konami from "@kasperrt/konami";
const [error, stop] = konami(() => {}, { target: new EventTarget(), once: true, capture: true });
if (error) { console.error(error.cause); }
if (stop) { stop(); }
`,
);
execFileSync(
  process.execPath,
  [
    resolve("node_modules/typescript/bin/tsc"),
    "--strict",
    "--noEmit",
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    join(directory, "smoke.ts"),
  ],
  { cwd: directory, stdio: "inherit" },
);
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const jsr = JSON.parse(readFileSync(join(root, "jsr.json"), "utf8"));
assert.equal(manifest.version, jsr.version);
assert.equal(manifest.name, jsr.name);
rmSync(directory, { recursive: true, force: true });
console.log("Packed package, exports, declarations, and versions passed.");
