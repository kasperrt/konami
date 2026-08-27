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
stop();
```

Pass a custom event target or make the listener self-destruct after one use:

```ts
konami(
  () => launchEasterEgg(),
  {
    target: window,
    once: true,
  },
);
```

The callback takes no arguments; it only describes what should happen after
the sequence completes. Listener creation uses an error-first `[error, data]`
tuple, so setup errors are values rather than exceptions. Registration and
environment failures retain their original error in `error.cause`. The
successful data value is the cleanup function. Outside a document environment,
pass an explicit `EventTarget` through `target`.

The package exports `konami`, `SafeWrap`, `KonamiOptions`, `KonamiCallback`,
and `KonamiCleanup`; `konami` is also the default export.

## License

MIT
