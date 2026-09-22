import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { readFileSync } from "node:fs";
import test from "node:test";

import konami, { konami as namedKonami } from "../dist/index.js";
import * as packageExports from "../dist/index.js";

const sequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

function press(target, keyCode) {
  const event = new Event("keydown");
  Object.defineProperties(event, {
    keyCode: { value: typeof keyCode === "number" ? keyCode : 0 },
    which: { value: typeof keyCode === "number" ? keyCode : 0 },
    key: { value: typeof keyCode === "string" ? keyCode : undefined },
  });
  target.dispatchEvent(event);
}

test("exposes matching default and named exports", () => {
  assert.equal(namedKonami, konami);
  assert.deepEqual(Object.keys(packageExports).sort(), ["default", "konami"]);
});

test("keeps arrow-key names obscured in the implementation and bundle", () => {
  for (const path of ["../src/index.ts", "../dist/index.js"]) {
    const content = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(content, /Arrow(?:Up|Down|Left|Right)/);
  }
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

test("recovers after unrelated input", () => {
  const target = new EventTarget();
  let triggers = 0;
  const [error] = konami(() => {
    triggers++;
  }, { target });

  assert.equal(error, null);

  [13, 38, ...sequence.slice(1)].forEach((key) => press(target, key));

  assert.equal(triggers, 1);
});

test("recognizes a complete sequence after every partial prefix", () => {
  for (let prefixLength = 0; prefixLength < sequence.length; prefixLength++) {
    const target = new EventTarget();
    let triggers = 0;
    const [error, stop] = konami(() => triggers++, { target });

    assert.equal(error, null);
    [...sequence.slice(0, prefixLength), ...sequence].forEach((key) => press(target, key));

    assert.equal(triggers, 1, `prefix length ${prefixLength}`);
    stop();
  }
});

test("retains the last two Up presses across repeated overlapping starts", () => {
  const target = new EventTarget();
  let triggers = 0;
  const [error, stop] = konami(() => triggers++, { target });

  assert.equal(error, null);
  [...Array(7).fill(38), ...sequence.slice(2)].forEach((key) => press(target, key));

  assert.equal(triggers, 1);
  stop();
});

test("requires a contiguous sequence after unrelated input", () => {
  const target = new EventTarget();
  let triggers = 0;
  const [error, stop] = konami(() => triggers++, { target });

  assert.equal(error, null);
  [...sequence.slice(0, 4), 13, ...sequence.slice(4)].forEach((key) => press(target, key));
  assert.equal(triggers, 0);

  sequence.forEach((key) => press(target, key));
  assert.equal(triggers, 1);
  stop();
});

test("supports modern key values and rejects unrelated named keys", () => {
  const target = new EventTarget();
  const keys = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let triggers = 0;
  const [error, stop] = konami(() => triggers++, { target });

  assert.equal(error, null);
  keys.map((key) => key === "ArrowRight" ? "MediaRecord" : key).forEach((key) => press(target, key));
  assert.equal(triggers, 0);

  keys.forEach((key) => press(target, key));
  keys.map((key) => key.length === 1 ? key.toUpperCase() : key).forEach((key) => press(target, key));
  assert.equal(triggers, 2);
  stop();
});

test("treats keydown events without keyboard fields as unrelated input", () => {
  const target = new EventTarget();
  let triggers = 0;
  const [error, stop] = konami(() => triggers++, { target });

  assert.equal(error, null);
  sequence.slice(0, 4).forEach((key) => press(target, key));
  target.dispatchEvent(new Event("keydown"));
  sequence.slice(4).forEach((key) => press(target, key));
  assert.equal(triggers, 0);

  sequence.forEach((key) => press(target, key));
  assert.equal(triggers, 1);
  stop();
});

for (const capture of [false, true]) {
  for (const once of [false, true]) {
    test(`removes the listener after options mutate (capture=${capture}, once=${once})`, () => {
      const target = new EventTarget();
      const options = { target, capture, once };
      let triggers = 0;
      const [error, stop] = konami(() => triggers++, options);

      assert.equal(error, null);
      assert.equal(getEventListeners(target, "keydown").length, 1);
      options.capture = !capture;

      if (once) {
        sequence.forEach((key) => press(target, key));
      } else {
        stop();
      }

      assert.equal(getEventListeners(target, "keydown").length, 0);
      sequence.forEach((key) => press(target, key));
      assert.equal(triggers, once ? 1 : 0);
      stop();
      stop();
    });
  }
}

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

for (const cause of [undefined, null, false, 0, ""]) {
  test(`preserves falsy setup failures (${String(cause)})`, () => {
    const target = new EventTarget();
    target.addEventListener = () => {
      throw cause;
    };

    const [error, stop] = konami(() => {}, { target });

    assert.equal(error?.message, "Listener setup failed");
    assert.equal(error.cause, cause);
    assert.equal(stop, null);
  });
}

test("returns a contextual error when no document target exists", () => {
  const [error, stop] = konami(() => {});

  assert.equal(error?.message, "Listener unavailable");
  assert.equal(error?.cause?.message, "No default target");
  assert.equal(error?.cause?.cause?.message, "Document unavailable");
  assert.equal(stop, null);
});
