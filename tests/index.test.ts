import { getEventListeners } from "node:events";
import { readFileSync } from "node:fs";
import { assert, describe, expect, test, vi } from "vitest";

import * as bundleExports from "../dist/index.js";
import * as sourceExports from "../src/index.js";

const sequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

function press(target: EventTarget, keyCode: number | string): void {
  const event = new Event("keydown");
  Object.defineProperties(event, {
    keyCode: { value: typeof keyCode === "number" ? keyCode : 0 },
    which: { value: typeof keyCode === "number" ? keyCode : 0 },
    key: { value: typeof keyCode === "string" ? keyCode : undefined },
  });
  target.dispatchEvent(event);
}

test("keeps arrow-key names obscured in the implementation and bundle", () => {
  for (const path of ["../src/index.ts", "../dist/index.js"]) {
    const content = readFileSync(new URL(path, import.meta.url), "utf8");
    expect(content).not.toMatch(/Arrow(?:Up|Down|Left|Right)/);
  }
});

describe.each([
  { name: "source", packageExports: sourceExports },
  { name: "bundle", packageExports: bundleExports },
])("$name", ({ packageExports }) => {
  const { default: konami, konami: namedKonami } = packageExports;

  test("exposes matching default and named exports", () => {
    expect(namedKonami).toBe(konami);
    expect(Object.keys(packageExports).sort()).toEqual(["default", "konami"]);
  });

  test("calls back when the sequence completes", () => {
    const target = new EventTarget();
    let triggers = 0;
    let callbackArgumentCount = -1;
    const [error, stop] = konami((...callbackArguments) => {
      triggers++;
      callbackArgumentCount = callbackArguments.length;
    }, { target });

    expect(error).toBeNull();
    assert(stop);

    sequence.forEach((key) => press(target, key));
    sequence.forEach((key) => press(target, key));

    expect(triggers).toBe(2);
    expect(callbackArgumentCount).toBe(0);
    expect(stop()).toBeUndefined();
  });

  test("supports once and cleanup", () => {
    const target = new EventTarget();
    let triggers = 0;
    const [error, stop] = konami(() => {
      triggers++;
    }, { target, once: true });

    expect(error).toBeNull();
    assert(stop);

    sequence.forEach((key) => press(target, key));
    sequence.forEach((key) => press(target, key));
    expect(stop()).toBeUndefined();

    expect(triggers).toBe(1);
  });

  test("recovers after unrelated input", () => {
    const target = new EventTarget();
    let triggers = 0;
    const [error, stop] = konami(() => {
      triggers++;
    }, { target });

    expect(error).toBeNull();
    assert(stop);

    [13, 38, ...sequence.slice(1)].forEach((key) => press(target, key));

    expect(triggers).toBe(1);
  });

  test("recognizes a complete sequence after every partial prefix", () => {
    for (let prefixLength = 0; prefixLength < sequence.length; prefixLength++) {
      const target = new EventTarget();
      let triggers = 0;
      const [error, stop] = konami(() => triggers++, { target });

      expect(error).toBeNull();
      assert(stop);
      [...sequence.slice(0, prefixLength), ...sequence].forEach((key) => press(target, key));

      expect(triggers, `prefix length ${prefixLength}`).toBe(1);
      stop();
    }
  });

  test("retains the last two Up presses across repeated overlapping starts", () => {
    const target = new EventTarget();
    let triggers = 0;
    const [error, stop] = konami(() => triggers++, { target });

    expect(error).toBeNull();
    assert(stop);
    [...Array(7).fill(38), ...sequence.slice(2)].forEach((key) => press(target, key));

    expect(triggers).toBe(1);
    stop();
  });

  test("requires a contiguous sequence after unrelated input", () => {
    const target = new EventTarget();
    let triggers = 0;
    const [error, stop] = konami(() => triggers++, { target });

    expect(error).toBeNull();
    assert(stop);
    [...sequence.slice(0, 4), 13, ...sequence.slice(4)].forEach((key) => press(target, key));
    expect(triggers).toBe(0);

    sequence.forEach((key) => press(target, key));
    expect(triggers).toBe(1);
    stop();
  });

  test("supports modern key values and rejects unrelated named keys", () => {
    const target = new EventTarget();
    const keys = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let triggers = 0;
    const [error, stop] = konami(() => triggers++, { target });

    expect(error).toBeNull();
    assert(stop);
    keys.map((key) => key === "ArrowRight" ? "MediaRecord" : key).forEach((key) => press(target, key));
    expect(triggers).toBe(0);

    keys.forEach((key) => press(target, key));
    keys.map((key) => key.length === 1 ? key.toUpperCase() : key).forEach((key) => press(target, key));
    expect(triggers).toBe(2);
    stop();
  });

  test("treats keydown events without keyboard fields as unrelated input", () => {
    const target = new EventTarget();
    let triggers = 0;
    const [error, stop] = konami(() => triggers++, { target });

    expect(error).toBeNull();
    assert(stop);
    sequence.slice(0, 4).forEach((key) => press(target, key));
    target.dispatchEvent(new Event("keydown"));
    sequence.slice(4).forEach((key) => press(target, key));
    expect(triggers).toBe(0);

    sequence.forEach((key) => press(target, key));
    expect(triggers).toBe(1);
    stop();
  });

  for (const capture of [false, true]) {
    for (const once of [false, true]) {
      test(`removes the listener after options mutate (capture=${capture}, once=${once})`, () => {
        const target = new EventTarget();
        const options = { target, capture, once };
        let triggers = 0;
        const [error, stop] = konami(() => triggers++, options);

        expect(error).toBeNull();
        assert(stop);
        expect(getEventListeners(target, "keydown").length).toBe(1);
        options.capture = !capture;

        if (once) {
          sequence.forEach((key) => press(target, key));
        } else {
          stop();
        }

        expect(getEventListeners(target, "keydown").length).toBe(0);
        sequence.forEach((key) => press(target, key));
        expect(triggers).toBe(once ? 1 : 0);
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

    expect(error?.message).toBe("Listener setup failed");
    expect(error?.cause).toMatchObject({ message: "setup failed" });
    expect(stop).toBeNull();
  });

  for (const cause of [undefined, null, false, 0, ""]) {
    test(`preserves falsy setup failures (${String(cause)})`, () => {
      const target = new EventTarget();
      target.addEventListener = () => {
        throw cause;
      };

      const [error, stop] = konami(() => {}, { target });

      expect(error?.message).toBe("Listener setup failed");
      expect(error?.cause).toBe(cause);
      expect(stop).toBeNull();
    });
  }

  test("uses the document as the default target and removes its listener", () => {
    const target = new EventTarget();
    let triggers = 0;
    vi.stubGlobal("document", target);

    try {
      const [error, stop] = konami(() => triggers++);

      expect(error).toBeNull();
      assert(stop);
      sequence.forEach((key) => press(target, key));
      expect(triggers).toBe(1);

      stop();
      expect(getEventListeners(target, "keydown")).toHaveLength(0);
      sequence.forEach((key) => press(target, key));
      expect(triggers).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("returns a contextual error when globalThis is unavailable", () => {
    const scope = globalThis;
    const descriptor = Object.getOwnPropertyDescriptor(scope, "globalThis");
    assert(descriptor);
    let result: ReturnType<typeof konami>;

    // Restore the global before assertions or test-runner code can use it.
    try {
      Object.defineProperty(scope, "globalThis", { ...descriptor, value: undefined });
      result = konami(() => {});
    } finally {
      Object.defineProperty(scope, "globalThis", descriptor);
    }

    const [error, stop] = result;
    expect(error?.message).toBe("Listener unavailable");
    expect(error?.cause).toMatchObject({
      message: "No default target",
      cause: { message: "Global unavailable" },
    });
    expect(stop).toBeNull();
  });

  test("returns a contextual error when no document target exists", () => {
    const [error, stop] = konami(() => {});

    expect(error?.message).toBe("Listener unavailable");
    expect(error?.cause).toMatchObject({
      message: "No default target",
      cause: { message: "Document unavailable" },
    });
    expect(stop).toBeNull();
  });
});
