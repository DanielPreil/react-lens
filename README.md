# react-lens

[Magyar README](./README.hu.md)

A lightweight, fast static advisor for modern React projects.

React Lens scans React, TypeScript and JavaScript files and reports suspicious patterns that are not always syntax errors, but may later cause performance, maintainability or safety problems.

It is not an ESLint replacement. It is an additional developer tool that gives explainable suggestions for React architecture and best-practice issues.

## What is it for?

In React, many problems are not immediately visible. The code works, but later it may:

- cause unnecessary re-renders,
- create stale state issues,
- become harder to understand,
- cause broken UI behavior when lists are reordered,
- or hide security risks.

React Lens tries to warn about these issues early during local development, pull requests or CI runs.

## Quick start

```bash
npx react-lens .
```

With pnpm:

```bash
pnpm dlx react-lens .
```

Hungarian output:

```bash
pnpm dlx react-lens . --lang hu
```

CI mode:

```bash
pnpm dlx react-lens . --ci --min-severity warning
```

Create a SARIF report:

```bash
pnpm dlx react-lens . --format sarif > react-lens.sarif
```

## Example output

```txt
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ React Lens Report                                                                 ┃
┃ Findings: 2  |  ERROR: 0  WARNING: 2  SUGGESTION: 0  INFO: 0                      ┃
┃ Files scanned: 125                                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌────────────────────────────────────────────────────────────────────────────────────
│ #1   WARNING   ● high  ─  Array index used as React key
│ src/components/UserList.tsx:21:9
│
│ Array index used as React key
│ Index keys cause incorrect reconciliation when items are reordered, inserted, or removed.
│
│ Current code:
│    19 │ {items.map((item, index) => (
│    20 │   <div
│ >  21 │     key={index}
│    22 │   >
│
│ Suggested fix:
│ key={item.id}
└────────────────────────────────────────────────────────────────────────────────────
```

## Main features

- Static React code analysis
- TypeScript and JavaScript support
- Readable terminal report
- English and Hungarian output
- JSON and SARIF output
- Optional interactive terminal UI
- Configurable rule severity
- Integration with recommended `eslint-plugin-react-hooks` rules
- CI-friendly exit codes
- Fixture-based test coverage

## What does it check?

React Lens currently looks for patterns such as:

| Rule | Default level | Meaning |
| --- | --- | --- |
| `effect-derived-state` | `warning` | State that could probably be calculated during render is synchronized through `useEffect` + `setState` |
| `effect-event-flag` | `warning` | Boolean flag state exists only to trigger effect-based event logic |
| `async-effect-race` | `warning` | Async effect may write an old response over newer state |
| `missing-effect-cleanup` | `error` | Listener, timer or subscription without cleanup |
| `unstable-context-value` | `warning` | Unstable `Context.Provider value` reference |
| `inline-prop-to-memo` | `warning` | Inline object, array or function passed to a memoized child component |
| `useless-memo` | `info` | Trivial value wrapped in `useMemo` |
| `unstable-memo-deps` | `warning` | Unstable value in a memo dependency array |
| `key-index-risk` | `warning` | Array index used as a React `key` |
| `rsc-client-boundary` | `warning` | Client-only hook in a likely server boundary |
| `server-function-contract` | `error` | Possible Server Function contract violation |
| `server-function-untrusted-input` | `warning` | Server Function input may be mutated without validation or authorization |
| `serializable-props-across-boundary` | `warning` | Non-serializable prop near a server/client boundary |
| `hydration-root-mismatch-risk` | `warning` | Possible hydration or `createRoot` usage risk |
| `dangerous-html-xss-risk` | `error` | Risky `dangerouslySetInnerHTML` usage |
| `client-env-secrets-risk` | `error` | Secret env variable may be used in client-side code |

Recommended official React Hooks lint rules can also be enabled. They appear with the `react-hooks/...` prefix.

## Configuration

You can create a `react-lens.config.json` file in the project root:

```json
{
  "include": ["src/**/*.{ts,tsx,js,jsx}"],
  "ignore": ["dist/**", "node_modules/**"],
  "reactCompiler": "auto",
  "officialHooksLint": "recommended",
  "rolloutMode": "gradual",
  "reactEnvironment": "auto",
  "rules": {
    "effect-derived-state": "warning",
    "missing-effect-cleanup": "error",
    "key-index-risk": "warning",
    "dangerous-html-xss-risk": "error",
    "client-env-secrets-risk": "error"
  }
}
```

Rule levels:

```txt
off
info
suggestion
warning
error
```

## CLI options

```bash
react-lens [target] [options]
```

| Option | Description |
| --- | --- |
| `--format <format>` | Output format: `pretty`, `json` or `sarif` |
| `--lang <lang>` | Language: `en` or `hu` |
| `--min-severity <level>` | Minimum level: `info`, `suggestion`, `warning`, `error` |
| `--interactive` | Interactive terminal report |
| `--theme <theme>` | Interactive theme: `noir`, `paper`, `amber` |
| `--ci` | Exit with an error code when warning or error findings exist |
| `--max-runtime-ms <ms>` | Maximum allowed runtime |
| `--perf-baseline-file <path>` | Runtime baseline file |
| `--max-runtime-growth-percent <percent>` | Allowed slowdown compared to the baseline |

## Interactive mode

```bash
react-lens . --interactive
```

Hungarian interactive output:

```bash
react-lens . --interactive --lang hu
```

Useful keys:

| Key | Action |
| --- | --- |
| `↑` / `↓` | Select finding |
| `tab` | Switch filter |
| `t` | Change theme |
| `o` | Open file |
| `c` | Copy suggested fix |
| `q` | Quit |

## When is it useful?

React Lens is useful when you want to:

- run a quick React code quality check,
- find suspicious patterns before a pull request,
- add architecture or performance-related warnings to CI,
- learn why a React pattern may be risky,
- create SARIF reports for code scanning tools.

It is not meant for:

- replacing ESLint,
- runtime performance profiling,
- exact render measurement,
- formal security auditing.

## Limitations

React Lens is heuristic by design. This means it may produce:

- false positives,
- false negatives,
- framework-specific edge cases,
- incomplete security conclusions.

It does not execute your code. It only inspects source files statically.

Security-related findings should be treated as review signals, not as proven vulnerabilities.

## Development

Install dependencies:

```bash
pnpm install
```

Typecheck:

```bash
pnpm exec tsc --noEmit
```

Build:

```bash
pnpm run build
```

Run tests:

```bash
pnpm run test
```

Run all checks:

```bash
pnpm run check
```

Run React Lens on itself:

```bash
pnpm run build
pnpm run scan
pnpm run scan:hu
```

## Project structure

```txt
src/cli.ts          CLI entry point
src/scanner/        file discovery and analysis pipeline
src/rules/          React Lens rules
src/config/         default settings and config schema
src/formatters/     pretty, JSON, SARIF and interactive output
src/i18n/           English and Hungarian messages
src/docs/           documentation helper logic
src/perf/           runtime budget checks
tests/fixtures/     positive and negative examples
tests/integration/  integration tests
tests/rules/        targeted rule tests
```

## License

[MIT](./LICENSE)
