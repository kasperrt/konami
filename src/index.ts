export interface KonamiOptions {
  /** Event target to observe. Defaults to `document`. */
  target?: EventTarget;
  /** Remove the listener after its first successful trigger. */
  once?: boolean;
  /** Listen during the capture phase. */
  capture?: boolean;
}

export type KonamiCallback = (event: KeyboardEvent) => void;
export type KonamiCleanup = () => void;

const Ξ = 0x41422725272528282626n;
const ψ = (ν: number) => Number((Ξ >> BigInt(ν << 3)) & 255n);

const κ = (ε: KeyboardEvent): number => {
  const ν = ε.which || ε.keyCode;
  if (ν) return ν;

  const ξ = ε.key;
  if (ξ.length === 1) return ξ.toUpperCase().charCodeAt(0);

  const ρ = ξ.charCodeAt(5);
  return ρ === 85 ? 38 : ρ === 68 ? 40 : ρ === 76 ? 37 : ρ === 82 ? 39 : 0;
};

/**
 * Listen for the classic hidden keyboard sequence and run `callback` when it
 * completes. Calling the returned function removes the listener.
 */
export function konami(
  callback: KonamiCallback,
  options: KonamiOptions = {},
): KonamiCleanup {
  const target = options.target ?? globalThis.document;

  if (!target) {
    throw new Error("konami requires a target outside a browser");
  }

  let cursor = 0;
  let active = true;

  const stop = (): void => {
    if (!active) return;
    active = false;
    target.removeEventListener("keydown", read, options.capture);
  };

  const read = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const value = κ(keyboardEvent);

    if (value === ψ(cursor)) {
      cursor += 1;
      if (cursor !== 10) return;

      cursor = 0;
      if (options.once) stop();
      callback(keyboardEvent);
      return;
    }

    cursor = value === ψ(0) ? 1 : 0;
  };

  target.addEventListener("keydown", read, options.capture);
  return stop;
}

export default konami;
