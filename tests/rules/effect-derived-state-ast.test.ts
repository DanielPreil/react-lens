import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { runAnalysis } from "../../src/scanner/runAnalysis.js";
import { defaultConfig } from "../../src/config/defaultConfig.js";

const fixtureRoot = resolve(process.cwd(), "tests/fixtures/rules/effect-derived-state/ast");

function pathFor(name: string): string {
  return resolve(fixtureRoot, name);
}

async function hasDerivedStateFinding(fileName: string): Promise<boolean> {
  const findings = await runAnalysis([pathFor(fileName)], defaultConfig);
  return findings.some((f) => f.ruleId === "effect-derived-state");
}

describe("effect-derived-state AST rule", () => {
  const positiveFixtures = [
    "p01.tsx",
    "p02.tsx",
    "p03.tsx",
    "p04.tsx",
    "p05.tsx",
    "p06.tsx",
    "p07.tsx",
    "p08.tsx",
    "p09.tsx",
    "p10.tsx"
  ];

  const negativeFixtures = [
    "n01.tsx",
    "n02.tsx",
    "n03.tsx",
    "n04.tsx",
    "n05.tsx",
    "n06.tsx",
    "n07.tsx",
    "n08.tsx",
    "n09.tsx",
    "n10.tsx"
  ];

  it("detects derived-state smells on positive fixtures", async () => {
    for (const fileName of positiveFixtures) {
      expect(await hasDerivedStateFinding(fileName), fileName).toBe(true);
    }
  });

  it("does not report on negative fixtures", async () => {
    for (const fileName of negativeFixtures) {
      expect(await hasDerivedStateFinding(fileName), fileName).toBe(false);
    }
  });

  it("returns high confidence on straightforward cases", async () => {
    const findings = await runAnalysis([pathFor("p01.tsx")], defaultConfig);
    const match = findings.find((f) => f.ruleId === "effect-derived-state");

    expect(match).toBeTruthy();
    expect(match?.confidence).toBe("high");
  });
});
