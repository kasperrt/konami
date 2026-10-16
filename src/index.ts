/**
 * A dependency-free keyboard sequence listener with explicit cleanup.
 * @module
 */
import { type SafeWrap, safeWrap } from "./safeWrap.ts";

interface KonamiOptions {
  /** Event target to observe. Defaults to `document`. */
  target?: EventTarget;
  /** Remove the listener after its first successful trigger. */
  once?: boolean;
  /** Listen during the capture phase. */
  capture?: boolean;
}

type KonamiCallback = () => void;
type KonamiCleanup = () => void;

const getDefaultTarget = (): SafeWrap<Error, EventTarget> => {
  if (typeof globalThis === "undefined") {
    const cause = new ReferenceError("Global unavailable");
    return [new Error("No default target", { cause }), null];
  }

  const target = globalThis.document;
  if (!target) {
    const cause = new ReferenceError("Document unavailable");
    return [new Error("No default target", { cause }), null];
  }

  return [null, target];
};

const packedSequence = 308174127199n * 1000000000000n + 173927773734n;
const directionKeyCodes = new Map<bigint, number>([
  [5197446826917901206610439012941936n, 38],
  [22322864144311358159350774568003056975675502n, 40],
  [22322864144311358159350774570254813838573684n, 37],
  [1462951224561589168331212362346901070071223287924n, 39],
]);

const getExpectedKeyCode = (index: number): number => {
  return Number((packedSequence >> BigInt(index << 3)) & 255n);
};

const getKeyCode = (event: KeyboardEvent): number => {
  const legacyKeyCode = event.which || event.keyCode;
  if (legacyKeyCode) {
    return legacyKeyCode;
  }

  const key = event.key ?? "";
  if (key.length === 1) {
    return key.toUpperCase().charCodeAt(0);
  }

  if (key.length > 10) {
    return 0;
  }

  let packedKey = 1n;
  for (let index = 0; index < key.length; index++) {
    packedKey = (packedKey << 16n) | BigInt(key.charCodeAt(index));
  }

  return directionKeyCodes.get(packedKey) ?? 0;
};

/**
 * Listen for the classic hidden keyboard sequence and run `callback` when it
 * completes. The successful value is a function that removes the listener.
 */
export function konami(
  callback: KonamiCallback,
  options: KonamiOptions = {},
): SafeWrap<Error, KonamiCleanup> {
  let target = options.target;

  if (!target) {
    const [targetError, defaultTarget] = getDefaultTarget();
    if (targetError) {
      return [
        new Error("Listener unavailable", {
          cause: targetError,
        }),
        null,
      ];
    }

    target = defaultTarget;
  }

  const once = options.once;
  let cursor = 0;
  let active = true;
  const listenerOptions = { capture: options.capture };

  const stop: KonamiCleanup = () => {
    if (!active) {
      return;
    }

    active = false;
    target.removeEventListener("keydown", read, listenerOptions);
  };

  const read = (event: Event): void => {
    if (!active) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    const keyCode = getKeyCode(keyboardEvent);

    if (keyCode === getExpectedKeyCode(cursor)) {
      cursor += 1;
      if (cursor !== 10) {
        return;
      }

      cursor = 0;
      if (once) {
        stop();
      }

      callback();
      return;
    }

    // Only the two-key opening prefix overlaps itself.
    cursor = keyCode === getExpectedKeyCode(0) ? (cursor === 2 ? 2 : 1) : 0;
  };

  const [error, cleanup] = safeWrap<unknown, KonamiCleanup>(() => {
    target.addEventListener("keydown", read, listenerOptions);
    return stop;
  });

  if (cleanup === null) {
    return [
      new Error("Listener setup failed", {
        cause: error,
      }),
      null,
    ];
  }

  return [null, cleanup];
}

export default konami;
