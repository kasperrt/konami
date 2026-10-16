import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";

const source = await readFile(
  new URL("../dist/index.js", import.meta.url),
  "utf8",
);
for (const engine of [chromium, firefox, webkit]) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  await page.setContent(
    '<!doctype html><html lang="en"><title>Smoke test</title><body></body></html>',
  );
  await page.evaluate(async (code) => {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/javascript" }),
    );
    const { default: konami } = await import(url);
    URL.revokeObjectURL(url);
    globalThis.calls = 0;
    const [error, stop] = konami(() => globalThis.calls++, {
      once: true,
      capture: true,
    });
    globalThis.setupError = error?.message;
    globalThis.stop = stop;
  }, source);
  assert.equal(await page.evaluate(() => globalThis.setupError), undefined);
  for (let repeat = 0; repeat < 2; repeat++) {
    for (const key of [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ]) {
      await page.keyboard.press(key);
    }
  }
  assert.equal(await page.evaluate(() => globalThis.calls), 1);
  await page.evaluate(() => {
    globalThis.stop();
    globalThis.stop();
  });
  await browser.close();
}
console.log("Chromium, Firefox, and WebKit smoke tests passed.");
