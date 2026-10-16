# @kasperrt/konami

A tiny, dependency-free Konami code listener for browsers. It has no side
effects until you call it, and it returns a cleanup function for easy use in
framework lifecycles.

[![CI](https://github.com/kasperrt/konami/actions/workflows/ci.yml/badge.svg)](https://github.com/kasperrt/konami/actions/workflows/ci.yml)
[![Bundle size](https://deno.bundlejs.com/?q=%40kasperrt%2Fkonami&badge=detailed)](https://bundlejs.com/?q=%40kasperrt%2Fkonami)

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

`konami` is the package's only public API and is available as both a named and
default export.

Options are captured when the listener is registered. Changing the options object
later does not change an existing listener. With `once: true`, the listener is
removed before the callback runs, including when the callback dispatches more events.
Cleanup is idempotent. Callback exceptions follow the event target's normal behavior.

The npm package is ESM. CommonJS applications can use dynamic `import()`.

## Development

Run `npm ci` and `npm test` to build the package, type-check the tests, and run
Vitest against the source and built bundle. Tests require 100% line coverage for
every file in `src`. Coverage is printed in the terminal and an HTML report is
written to `coverage/index.html`.

## License

MIT

## Validation and releases

Development uses Node.js 22.12+ or 24+. Dependency versions are pinned exactly.

- `npm run check`: Biome formatting/lint and TypeScript checks.
- `npm test`: source and bundle regressions with 100% per-file line coverage.
- `npm run pack:check`: publint and TypeScript export resolution checks.
- `npm run smoke:pack`: installs the real tarball in an isolated consumer and checks runtime behavior and declarations.
- `npm run smoke:browser`: real keyboard input in Chromium, Firefox, and WebKit.
  Install browsers first with `npx playwright install`.

CI runs for pull requests, main, and merge queues. The required aggregate check
fails if any test, package smoke test, browser test, or JSR validation fails.

To release, update `package.json` and `jsr.json` together, update the lockfile,
and merge a passing pull request. Push the matching `v` tag (for example `v0.0.1`).
The release workflow validates that the tag belongs to main and reruns all checks
before publishing. Prereleases use npm's `next` tag. Failed releases can be retried
with the workflow dispatch on the same tag; existing versions are skipped.

Both registries use GitHub Actions OIDC with the `release` environment. Configure
npm's trusted publisher for `kasperrt/konami`, workflow `release.yml`, environment
`release`, with direct publishing allowed. Link the JSR package to the same GitHub
repository and require CI publishing. No publishing tokens are needed.
