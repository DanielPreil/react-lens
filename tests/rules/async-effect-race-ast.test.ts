import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { runAnalysis } from "../../src/scanner/runAnalysis.js";
import { defaultConfig } from "../../src/config/defaultConfig.js";

const root = resolve(process.cwd(), "tests/fixtures/rules/async-effect-race");

function fixture(name: string): string {
  return resolve(root, name);
}

async function hasRaceFinding(file: string): Promise<boolean> {
  const findings = await runAnalysis([fixture(file)], defaultConfig);
  return findings.some((finding) => finding.ruleId === "async-effect-race");
}

describe("async-effect-race AST rule", () => {
  it("reports race-prone async effects", async () => {
    expect(await hasRaceFinding("positive.tsx")).toBe(true);
    expect(await hasRaceFinding("await-positive.tsx")).toBe(true);
  });

  it("does not report protected async effects", async () => {
    expect(await hasRaceFinding("negative.tsx")).toBe(false);
    expect(await hasRaceFinding("ignore-negative.tsx")).toBe(false);
  });
});
