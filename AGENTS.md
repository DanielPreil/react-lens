# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

- Project: `react-lens`
- Type: TypeScript CLI static analysis tool for modern React codebases.
- Goal: Detect React architecture/performance/safety smells and emit actionable findings in pretty, JSON, and SARIF formats.
- Runtime model:
  - Native React Lens rules (custom AST + regex heuristics)
  - Optional official baseline (`eslint-plugin-react-hooks` recommended) normalized into the same finding model

## Scope and Priority

When changing code, optimize for:

1. Correct findings (low false-positive/false-negative risk)
2. Backward-compatible CLI/output behavior
3. Stable test coverage with fixture-driven verification
4. Clear, localized developer guidance in outputs

## Package Manager and Commands

Use `pnpm` as the primary package manager.

- Install dependencies: `pnpm install`
- Build: `pnpm run build`
- Test: `pnpm run test`
- Full check (required before handoff): `pnpm run check`
- Dev run: `pnpm run dev`

`npm` compatibility exists, but changes should be validated with `pnpm` commands above.

## Repository Map

- `src/cli.ts` - CLI entrypoint and options
- `src/scanner/` - file scanning + analysis pipeline
- `src/rules/` - native React Lens rules
- `src/config/` - defaults, schema, and config loading
- `src/formatters/` - pretty/json/sarif output
- `src/i18n/` - EN/HU labels and rule text
- `src/docs/` - docs coverage matrix helpers
- `tests/fixtures/` - rule fixtures
- `tests/rules/` + `tests/integration/` - unit/integration coverage
- `dist/` - build artifacts (generated)

## Hard Rules for Code Changes

- Do not edit generated artifacts in `dist/` manually.
- Keep TypeScript strictness intact; do not weaken compiler checks.
- Avoid introducing broad `any` typing; prefer explicit types.
- Preserve existing public function names unless the task explicitly requires breaking change.
- Keep output format contracts stable (`formatPretty`, `formatJson`, `formatSarif`).
- For React best-practice claims, prefer official `react.dev` guidance.

## Rule Authoring Contract

When adding or modifying a **native rule**, update all relevant layers together:

1. Rule implementation under `src/rules/`
2. Rule registration in `src/rules/coreRules.ts`
3. Rule typing in `src/types/findings.ts` (`CoreRuleId` / related types)
4. Config defaults in `src/config/defaultConfig.ts`
5. Config schema in `src/config/schema.ts`
6. i18n display strings in `src/i18n/messages.ts`
7. Fixtures + tests (positive and negative)
8. README rule/config documentation

If any of the above is not applicable, document the reason in the PR/summary.

## Official Hooks Lint Integration Rules

- Official lint findings must be normalized through scanner pipeline (not printed separately).
- Preserve source attribution via `source: "react-hooks-eslint"`.
- Severity mapping must respect `rolloutMode`:
  - `gradual`: downgrade official errors to warning for adoption
  - `strict`: preserve official severity (`error`/`warning`)
  - `report-only`: emit as `info`
- Never duplicate equivalent findings if deduplication fingerprint matches.

## Testing Requirements

For every meaningful change:

- Add/update fixtures to demonstrate behavior.
- Include both positive and negative cases when changing rule logic.
- Run `pnpm run check` before handoff.
- If tests are skipped or blocked, state exactly why.

Minimum acceptance for rule changes:

- No regression in existing tests
- New behavior covered by targeted tests in `tests/rules/`
- Integration path still validated in `tests/integration/` or new integration spec

## Documentation Requirements

When behavior changes, update documentation in the same change:

- `README.md` for user-visible flags/config/rules
- Relevant inline comments only where logic is non-obvious
- Keep examples executable and aligned with current CLI flags

## Output and UX Guidelines

- Findings should remain actionable, concise, and specific.
- Prefer suggestions that are directly implementable.
- Confidence should reflect heuristic certainty (`high`/`medium`/`low`) honestly.
- Keep localization consistent: if a new rule is user-visible, ensure EN and HU coverage (or safe fallback behavior).

## Safety and Security

- Do not add telemetry, network calls, or external data exfiltration behavior.
- Treat server-function/security checks conservatively; avoid claiming guarantees when heuristics are used.
- If a check is heuristic, language should explicitly indicate risk/potential, not certainty.

## Non-Goals

- Do not turn this project into a full ESLint replacement.
- Do not add framework-specific runtime coupling unless explicitly requested.
- Do not introduce breaking CLI flag changes without explicit migration notes.

## Handoff Checklist

Before finalizing work, verify:

1. `pnpm run check` passes
2. Changed behavior is fixture-tested
3. README/config docs updated when needed
4. No manual edits in generated `dist/`
5. Summary clearly states what changed and why

## Nested AGENTS.md

If a deeper subdirectory introduces its own `AGENTS.md`, follow the most specific file for that scope.
