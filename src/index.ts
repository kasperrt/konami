export interface KonamiOptions {
  /** Event target to observe. Defaults to `document`. */
  target?: EventTarget;
  /** Remove the listener after its first successful trigger. */
  once?: boolean;
  /** Listen during the capture phase. */
  capture?: boolean;
}

export type SafeWrap<ErrorType = Error, DataType = unknown> =
  | [error: ErrorType, data: null]
  | [error: null, data: DataType];

export type KonamiCallback = (event: KeyboardEvent) => void;
export type KonamiCleanup = () => void;

const packedSequence = BigInt("308174127199173927773734");
const getExpectedKeyCode = (index: number): number =>
  Number((packedSequence >> BigInt(index << 3)) & 255n);

const getKeyCode = (event: KeyboardEvent): number => {
  const legacyKeyCode = event.which || event.keyCode;
  if (legacyKeyCode) return legacyKeyCode;

  const key = event.key;
  if (key.length === 1) return key.toUpperCase().charCodeAt(0);

  const directionCode = key.charCodeAt(5);
  return directionCode === 85
    ? 38
    : directionCode === 68
      ? 40
      : directionCode === 76
        ? 37
        : directionCode === 82
          ? 39
          : 0;
};

/**
 * Listen for the classic hidden keyboard sequence and run `callback` when it
 * completes. The successful value is a function that removes the listener.
 */
export function konami(
  callback: KonamiCallback,
  options: KonamiOptions = {},
): SafeWrap<Error, KonamiCleanup> {
  const target = options.target ?? globalThis.document;

  if (!target) {
    return [new Error("konami requires a target outside a browser"), null];
  }

  let cursor = 0;
  let active = true;

  const stop: KonamiCleanup = () => {
    if (!active) return;
    active = false;
    target.removeEventListener("keydown", read, options.capture);
  };

  const read = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const keyCode = getKeyCode(keyboardEvent);

    if (keyCode === getExpectedKeyCode(cursor)) {
      cursor += 1;
      if (cursor !== 10) return;

      cursor = 0;
      if (options.once) stop();
      callback(keyboardEvent);
      return;
    }

    cursor = keyCode === getExpectedKeyCode(0) ? 1 : 0;
  };

  try {
    target.addEventListener("keydown", read, options.capture);
  } catch (error) {
    return [error instanceof Error ? error : new Error("Unknown error"), null];
  }

  return [null, stop];
}

export default konami;
