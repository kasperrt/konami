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
  const stop = konami(() => triggers++, { target });

  sequence.forEach((key) => press(target, key));
  sequence.forEach((key) => press(target, key));

  assert.equal(triggers, 2);
  stop();
});

test("supports once and cleanup", () => {
  const target = new EventTarget();
  let triggers = 0;
  const stop = konami(() => triggers++, { target, once: true });

  sequence.forEach((key) => press(target, key));
  sequence.forEach((key) => press(target, key));
  stop();

  assert.equal(triggers, 1);
});

test("recovers after unrelated input and overlapping starts", () => {
  const target = new EventTarget();
  let triggers = 0;
  konami(() => triggers++, { target });

  [13, 38, ...sequence.slice(1)].forEach((key) => press(target, key));

  assert.equal(triggers, 1);
});
