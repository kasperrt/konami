import { safeWrap, type SafeWrap } from "./safeWrap.js";

export type { SafeWrap } from "./safeWrap.js";

export interface KonamiOptions {
  /** Event target to observe. Defaults to `document`. */
  target?: EventTarget;
  /** Remove the listener after its first successful trigger. */
  once?: boolean;
  /** Listen during the capture phase. */
  capture?: boolean;
}

export type KonamiCallback = () => void;
export type KonamiCleanup = () => void;

const getDefaultTarget = (): SafeWrap<Error, EventTarget> => {
  if (typeof globalThis === "undefined") {
    const cause = new ReferenceError("globalThis is unavailable");
    return [new Error("Unable to find a default event target", { cause }), null];
  }

  const target = globalThis.document;
  if (!target) {
    const cause = new ReferenceError("globalThis.document is unavailable");
    return [new Error("Unable to find a default event target", { cause }), null];
  }

  return [null, target];
};

const packedSequence = BigInt("308174127199173927773734");
const getExpectedKeyCode = (index: number): number => {
  return Number((packedSequence >> BigInt(index << 3)) & 255n);
};

const getKeyCode = (event: KeyboardEvent): number => {
  const legacyKeyCode = event.which || event.keyCode;
  if (legacyKeyCode) {
    return legacyKeyCode;
  }

  const key = event.key;
  if (key.length === 1) {
    return key.toUpperCase().charCodeAt(0);
  }

  const directionCode = key.charCodeAt(5);
  switch (directionCode) {
    case 85:
      return 38;
    case 68:
      return 40;
    case 76:
      return 37;
    case 82:
      return 39;
    default:
      return 0;
  }
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
        new Error("Unable to initialize the Konami listener", {
          cause: targetError,
        }),
        null,
      ];
    }

    target = defaultTarget;
  }

  let cursor = 0;
  let active = true;

  const stop: KonamiCleanup = () => {
    if (!active) {
      return;
    }

    active = false;
    target.removeEventListener("keydown", read, options.capture);
  };

  const read = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const keyCode = getKeyCode(keyboardEvent);

    if (keyCode === getExpectedKeyCode(cursor)) {
      cursor += 1;
      if (cursor !== 10) {
        return;
      }

      cursor = 0;
      if (options.once) {
        stop();
      }

      callback();
      return;
    }

    cursor = 0;
    if (keyCode === getExpectedKeyCode(0)) {
      cursor = 1;
    }
  };

  const [error] = safeWrap<unknown, void>(() => {
    target.addEventListener("keydown", read, options.capture);
  });

  if (error) {
    return [
      new Error("Unable to register the Konami listener", {
        cause: error,
      }),
      null,
    ];
  }

  return [null, stop];
}

export default konami;
