# react-lens

A lightweight static advisor for modern React applications.

React Lens scans your codebase and explains suspicious React patterns before they become bugs or performance issues.

## Why not just DevTools/React Scan/ESLint?

- React DevTools and React Scan are runtime tools.
- ESLint focuses on rule correctness.
- React Lens focuses on architecture and decision-quality smells with explainable guidance.

## Positioning

DevTools shows what is slow. React Lens helps explain why the code structure got there and what to change early in PR/CI.

## Rules

- effect-derived-state
- effect-event-flag
- async-effect-race
- missing-effect-cleanup
- unstable-context-value
- inline-prop-to-memo
- useless-memo
- unstable-memo-deps
- rsc-client-boundary
- server-function-contract
- server-function-untrusted-input
- serializable-props-across-boundary
- hydration-root-mismatch-risk
- dangerous-html-xss-risk
- client-env-secrets-risk

Official baseline integration:

- `eslint-plugin-react-hooks` recommended rules are ingested as `react-hooks/<ruleName>` findings.

## Usage

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm run build
pnpm run scan
pnpm run scan:hu
pnpm run scan:tui
pnpm run scan:tui:paper
pnpm run scan:tui:amber
pnpm run scan:tui:hu
pnpm run scan:ci
pnpm run scan:sarif
node dist/cli.js . --lang hu
node dist/cli.js . --interactive --lang hu
node dist/cli.js . --interactive --theme noir
node dist/cli.js . --coverage-matrix
node dist/cli.js . --max-runtime-ms 2000
node dist/cli.js . --perf-baseline-file .react-lens-perf.json --update-perf-baseline
node dist/cli.js . --perf-baseline-file .react-lens-perf.json --max-runtime-growth-percent 30
```

`npm` also works if you prefer:

```bash
npm install
npm run build
```

## Testing

```bash
pnpm run test
```

## Try on your project

```bash
pnpm run build
node /ABSOLUTE/PATH/TO/react-lens/dist/cli.js /ABSOLUTE/PATH/TO/YOUR-APP --lang hu
node /ABSOLUTE/PATH/TO/react-lens/dist/cli.js /ABSOLUTE/PATH/TO/YOUR-APP --ci --min-severity warning
node /ABSOLUTE/PATH/TO/react-lens/dist/cli.js /ABSOLUTE/PATH/TO/YOUR-APP --format sarif > react-lens.sarif
```

Fixture-based integration tests live under:

- `tests/fixtures/rules/*`
- `tests/fixtures/integration/*`
- `tests/integration/fixtures.test.ts`

Repository sample policy:

- `tests/fixtures/` is the single source of truth for sample code snippets (positive/negative/edge cases).
- We do not keep a separate `src/examples` demo corpus to avoid duplicate, drifting examples.
- If you add a new rule, add fixtures instead of ad-hoc example files.

## Config (optional)

Create `react-lens.config.json`:

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
    "server-function-contract": "error",
    "dangerous-html-xss-risk": "error",
    "client-env-secrets-risk": "error"
  }
}
```

`reactCompiler`:

- `"auto"`: compiler-aware exceptions are enabled when code uses directives like `"use memo"`.
- `"on"`: same behavior as auto, but explicit.
- `"off"`: disables compiler-aware exceptions (stricter findings).

`officialHooksLint`:

- `"recommended"`: runs official `eslint-plugin-react-hooks` recommended checks and merges them into React Lens findings.
- `"off"`: disables official hooks lint integration.

`rolloutMode`:

- `"gradual"`: official lint errors are downgraded to warnings during adoption.
- `"strict"`: official lint severities are preserved (`error` / `warning`).
- `"report-only"`: official lint findings are informational.

`reactEnvironment`:

- `"auto"`: RSC checks run only on likely server-evaluated modules (heuristic).
- `"client"`: disables RSC/server-boundary checks.
- `"rsc"`: forces RSC/server-boundary checks.

File discovery behavior:

- Primary scan uses your configured `include` patterns.
- If those patterns match nothing in the target folder, React Lens falls back to `**/*.{ts,tsx,js,jsx}` (respecting `ignore`) so non-`src/` project layouts still work out of the box.

Performance guard:

- `--max-runtime-ms`: hard runtime budget in milliseconds.
- `--perf-baseline-file`: JSON file used as runtime baseline.
- `--max-runtime-growth-percent`: max allowed growth versus baseline runtime.
- `--update-perf-baseline`: rewrites baseline with current run metrics.

Interactive terminal UI:

- Use `--interactive` with `--format pretty` (default format).
- Theme switch: `--theme noir|paper|amber` (or press `t` inside TUI to cycle).
- Keyboard: `↑/↓` select finding, `tab` switch filter, `t` switch theme, `o` open file, `c` copy fix, `q` quit.
- The example fix is rendered in a separate full-width bottom box for better horizontal space.

## Known Limitations

- Several checks are heuristic by design and may report false positives/false negatives.
- RSC-related checks are framework-agnostic and rely on static code signals.
- The tool is static analysis only; it does not execute code paths.

## Support Matrix

- Node.js: `>=18.18.0`
- Package manager: `pnpm` recommended (`npm` compatible)
- Language: TypeScript / JavaScript React codebases (`.ts`, `.tsx`, `.js`, `.jsx`)

## Release Checklist

1. `pnpm install`
2. `pnpm run check`
3. `pnpm run scan`
4. `pnpm run scan:ci`
5. `pnpm run scan:sarif`
