import assert from "node:assert/strict";
import test from "node:test";

import konami, { konami as namedKonami } from "../dist/index.js";

const sequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

function press(target, keyCode) {
  const event = new Event("keydown");
  Object.defineProperties(event, {
    keyCode: { value: keyCode },
    which: { value: keyCode },
  });
  target.dispatchEvent(event);
}

test("exposes matching default and named exports", () => {
  assert.equal(namedKonami, konami);
});

test("calls back when the sequence completes", () => {
  const target = new EventTarget();
  let triggers = 0;
  let callbackArgumentCount = -1;
  const [error, stop] = konami((...callbackArguments) => {
    triggers++;
    callbackArgumentCount = callbackArguments.length;
  }, { target });

  assert.equal(error, null);
  assert.ok(stop);

  sequence.forEach((key) => press(target, key));
  sequence.forEach((key) => press(target, key));

  assert.equal(triggers, 2);
  assert.equal(callbackArgumentCount, 0);
  assert.equal(stop(), undefined);
});

test("supports once and cleanup", () => {
  const target = new EventTarget();
  let triggers = 0;
  const [error, stop] = konami(() => {
    triggers++;
  }, { target, once: true });

  assert.equal(error, null);
  assert.ok(stop);

  sequence.forEach((key) => press(target, key));
  sequence.forEach((key) => press(target, key));
  assert.equal(stop(), undefined);

  assert.equal(triggers, 1);
});

test("recovers after unrelated input and overlapping starts", () => {
  const target = new EventTarget();
  let triggers = 0;
  const [error] = konami(() => {
    triggers++;
  }, { target });

  assert.equal(error, null);

  [13, 38, ...sequence.slice(1)].forEach((key) => press(target, key));

  assert.equal(triggers, 1);
});

test("returns setup errors as values", () => {
  const target = new EventTarget();
  target.addEventListener = () => {
    throw new Error("setup failed");
  };

  const [error, stop] = konami(() => {}, { target });

  assert.equal(error?.message, "Listener setup failed");
  assert.equal(error?.cause?.message, "setup failed");
  assert.equal(stop, null);
});

test("returns a contextual error when no document target exists", () => {
  const [error, stop] = konami(() => {});

  assert.equal(error?.message, "Listener unavailable");
  assert.equal(error?.cause?.message, "No default target");
  assert.equal(error?.cause?.cause?.message, "Document unavailable");
  assert.equal(stop, null);
});
