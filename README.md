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

const stop = konami(() => {
  document.documentElement.classList.add("party");
});

// Remove it whenever you want:
stop();
```

Pass a custom event target or make the listener self-destruct after one use:

```ts
konami(
  () => launchEasterEgg(),
  { target: window, once: true },
);
```

The callback receives the final `KeyboardEvent`. The package exports
`konami`, `KonamiOptions`, `KonamiCallback`, and `KonamiCleanup`; `konami` is
also the default export.

## License

MIT
