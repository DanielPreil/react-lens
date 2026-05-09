import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { runAnalysis } from "../../src/scanner/runAnalysis.js";
import { defaultConfig } from "../../src/config/defaultConfig.js";
import { formatPretty } from "../../src/formatters/pretty.js";
import { formatSarif } from "../../src/formatters/sarif.js";

const root = resolve(process.cwd(), "tests/fixtures");

function fixture(ruleId: string, name: string): string {
  return resolve(root, "rules", ruleId, name);
}

function integrationFixture(name: string): string {
  return resolve(root, "integration", name);
}

describe("rule coverage on fixture files", () => {
  it("detects expected rule hits on positive fixtures", async () => {
    const cases: Array<{ file: string; ruleId: string }> = [
      { file: "positive.tsx", ruleId: "effect-derived-state" },
      { file: "positive.tsx", ruleId: "effect-event-flag" },
      { file: "positive.tsx", ruleId: "async-effect-race" },
      { file: "await-positive.tsx", ruleId: "async-effect-race" },
      { file: "positive.tsx", ruleId: "missing-effect-cleanup" },
      { file: "positive.tsx", ruleId: "unstable-context-value" },
      { file: "positive.tsx", ruleId: "inline-prop-to-memo" },
      { file: "positive.tsx", ruleId: "useless-memo" },
      { file: "positive.tsx", ruleId: "unstable-memo-deps" },
      { file: "positive.tsx", ruleId: "dangerous-html-xss-risk" },
      { file: "positive.tsx", ruleId: "client-env-secrets-risk" }
    ];

    for (const c of cases) {
      const findings = await runAnalysis([fixture(c.ruleId, c.file)], defaultConfig);
      expect(findings.some((f) => f.ruleId === c.ruleId)).toBe(true);
    }
  });

  it("avoids false positives on negative fixtures", async () => {
    const derivedNegative = await runAnalysis([fixture("effect-derived-state", "negative.tsx")], defaultConfig);
    expect(derivedNegative.some((f) => f.ruleId === "effect-derived-state")).toBe(false);

    const raceNegative = await runAnalysis([fixture("async-effect-race", "negative.tsx")], defaultConfig);
    expect(raceNegative.some((f) => f.ruleId === "async-effect-race")).toBe(false);

    const raceIgnoreNegative = await runAnalysis([fixture("async-effect-race", "ignore-negative.tsx")], defaultConfig);
    expect(raceIgnoreNegative.some((f) => f.ruleId === "async-effect-race")).toBe(false);

    const cleanupNegative = await runAnalysis([fixture("missing-effect-cleanup", "negative.tsx")], defaultConfig);
    expect(cleanupNegative.some((f) => f.ruleId === "missing-effect-cleanup")).toBe(false);
  });

  it("skips unstable context warning when component uses compiler memo directive", async () => {
    const findings = await runAnalysis([fixture("unstable-context-value", "use-memo.tsx")], defaultConfig);
    expect(findings.some((f) => f.ruleId === "unstable-context-value")).toBe(false);
  });

  it("still reports unstable context warning when compiler mode is forced off", async () => {
    const findings = await runAnalysis([fixture("unstable-context-value", "use-memo.tsx")], {
      ...defaultConfig,
      reactCompiler: "off"
    });
    expect(findings.some((f) => f.ruleId === "unstable-context-value")).toBe(true);
  });

  it("detects multiple findings in a complex mixed fixture", async () => {
    const findings = await runAnalysis([integrationFixture("complex-combo.tsx")], defaultConfig);
    const ids = new Set(findings.map((f) => f.ruleId));

    expect(ids.has("effect-derived-state")).toBe(true);
    expect(ids.has("async-effect-race")).toBe(true);
    expect(ids.has("inline-prop-to-memo")).toBe(true);
    expect(ids.has("useless-memo")).toBe(true);
  });

  it("formats Hungarian output with localized headings and fix example", async () => {
    const findings = await runAnalysis([fixture("effect-derived-state", "positive.tsx")], defaultConfig);
    const output = formatPretty(findings, { lang: "hu", filesScanned: 1 });

    expect(output).toContain("React Lens Jelentés");
    expect(output).toContain("Javítási lépések");
    expect(output).toContain("Szabály neve");
    expect(output).toContain("Származtatott `state` valószínűleg `useEffect`-ben van szinkronizálva");
    expect(output).toContain("Javasolt kódminta");
    expect(output).toContain("```tsx");
  });

  it("emits SARIF 2.1.0 output for CI code scanning", async () => {
    const findings = await runAnalysis([fixture("effect-derived-state", "positive.tsx")], defaultConfig);
    const sarifText = formatSarif(findings);
    const sarif = JSON.parse(sarifText);

    expect(sarif.version).toBe("2.1.0");
    expect(Array.isArray(sarif.runs)).toBe(true);
    expect(sarif.runs[0].results.length).toBeGreaterThan(0);
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.region.startLine).toBeGreaterThan(0);
  });
});
