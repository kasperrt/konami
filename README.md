# @kasperrt/konami

A tiny, dependency-free Konami code listener for browsers. It has no side
effects until you call it, and it returns a cleanup function for easy use in
framework lifecycles.

## Install

```sh
npm install @kasperrt/konami
```

Or with JSR:

```sh
deno add jsr:@kasperrt/konami
```

## Use

```ts
import konami from "@kasperrt/konami";

const [error, stop] = konami(() => {
  document.documentElement.classList.add("party");
});

if (error) {
  console.error(error);
  return;
}

// Remove it whenever you want:
const [stopError] = stop();
```

Pass a custom event target or make the listener self-destruct after one use:

```ts
konami(
  () => launchEasterEgg(),
  {
    target: window,
    once: true,
    onError: (error) => console.error(error),
  },
);
```

The callback receives the final `KeyboardEvent`. Setup and cleanup use
error-first `[error, data]` tuples, while errors raised later by callbacks or
event targets are passed to `onError`. Nothing is thrown by the package.

The package exports `konami`, `SafeWrap`, `KonamiOptions`, `KonamiCallback`,
and `KonamiCleanup`; `konami` is also the default export.

## License

MIT
