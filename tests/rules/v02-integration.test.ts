import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { runAnalysis } from "../../src/scanner/runAnalysis.js";
import { defaultConfig } from "../../src/config/defaultConfig.js";
import { buildCoverageBacklog, buildDocsCoverageMatrix } from "../../src/docs/coverageMatrix.js";

const root = resolve(process.cwd(), "tests/fixtures");

function fixture(ruleId: string, name: string): string {
  return resolve(root, "rules", ruleId, name);
}

describe("v0.2 official hooks integration", () => {
  it("ingests official react-hooks findings with metadata", async () => {
    const findings = await runAnalysis([fixture("official-hooks", "rules-of-hooks-positive.tsx")], defaultConfig);
    const ruleFinding = findings.find((f) => f.ruleId === "react-hooks/rules-of-hooks");

    expect(ruleFinding).toBeTruthy();
    expect(ruleFinding?.source).toBe("react-hooks-eslint");
    expect(ruleFinding?.severity).toBe("warning");
    expect(ruleFinding?.fingerprint).toBeTruthy();
  });

  it("supports rollout severity mapping", async () => {
    const strictFindings = await runAnalysis([fixture("official-hooks", "rules-of-hooks-positive.tsx")], {
      ...defaultConfig,
      rolloutMode: "strict"
    });
    const strict = strictFindings.find((f) => f.ruleId === "react-hooks/rules-of-hooks");

    expect(strict?.severity).toBe("error");

    const reportOnlyFindings = await runAnalysis([fixture("official-hooks", "rules-of-hooks-positive.tsx")], {
      ...defaultConfig,
      rolloutMode: "report-only"
    });
    const reportOnly = reportOnlyFindings.find((f) => f.ruleId === "react-hooks/rules-of-hooks");

    expect(reportOnly?.severity).toBe("info");
  });

  it("can disable official hooks lint", async () => {
    const findings = await runAnalysis([fixture("official-hooks", "rules-of-hooks-positive.tsx")], {
      ...defaultConfig,
      officialHooksLint: "off"
    });

    expect(findings.some((f) => f.ruleId.startsWith("react-hooks/"))).toBe(false);
  });
});

describe("v0.2 custom rules", () => {
  it("detects rsc client boundary misuse", async () => {
    const findings = await runAnalysis([fixture("rsc-client-boundary", "positive.tsx")], {
      ...defaultConfig,
      reactEnvironment: "rsc"
    });
    expect(findings.some((f) => f.ruleId === "rsc-client-boundary")).toBe(true);

    const negative = await runAnalysis([fixture("rsc-client-boundary", "negative.tsx")], {
      ...defaultConfig,
      reactEnvironment: "rsc"
    });
    expect(negative.some((f) => f.ruleId === "rsc-client-boundary")).toBe(false);
  });

  it("detects server function contract and security issues", async () => {
    const contract = await runAnalysis([fixture("server-function-contract", "positive.ts")], defaultConfig);
    expect(contract.some((f) => f.ruleId === "server-function-contract")).toBe(true);

    const misplaced = await runAnalysis([fixture("server-function-contract", "misplaced-positive.ts")], defaultConfig);
    expect(misplaced.some((f) => f.ruleId === "server-function-contract")).toBe(true);

    const untrusted = await runAnalysis([fixture("server-function-untrusted-input", "positive.ts")], defaultConfig);
    expect(untrusted.some((f) => f.ruleId === "server-function-untrusted-input")).toBe(true);

    const trusted = await runAnalysis([fixture("server-function-untrusted-input", "negative.ts")], defaultConfig);
    expect(trusted.some((f) => f.ruleId === "server-function-untrusted-input")).toBe(false);
  });

  it("detects boundary serialization and hydration mismatch risks", async () => {
    const boundary = await runAnalysis([fixture("serializable-props-across-boundary", "positive.tsx")], {
      ...defaultConfig,
      reactEnvironment: "rsc"
    });
    expect(boundary.some((f) => f.ruleId === "serializable-props-across-boundary")).toBe(true);

    const boundaryNegative = await runAnalysis([fixture("serializable-props-across-boundary", "negative.tsx")], {
      ...defaultConfig,
      reactEnvironment: "rsc"
    });
    expect(boundaryNegative.some((f) => f.ruleId === "serializable-props-across-boundary")).toBe(false);

    const hydration = await runAnalysis([fixture("hydration-root-mismatch-risk", "positive.tsx")], defaultConfig);
    expect(hydration.some((f) => f.ruleId === "hydration-root-mismatch-risk")).toBe(true);

    const hydrationNegative = await runAnalysis([fixture("hydration-root-mismatch-risk", "negative.tsx")], defaultConfig);
    expect(hydrationNegative.some((f) => f.ruleId === "hydration-root-mismatch-risk")).toBe(false);
  });

  it("detects security risks for dangerous HTML and client env secrets", async () => {
    const dangerous = await runAnalysis([fixture("dangerous-html-xss-risk", "positive.tsx")], defaultConfig);
    expect(dangerous.some((f) => f.ruleId === "dangerous-html-xss-risk")).toBe(true);

    const dangerousNegative = await runAnalysis([fixture("dangerous-html-xss-risk", "negative.tsx")], defaultConfig);
    expect(dangerousNegative.some((f) => f.ruleId === "dangerous-html-xss-risk")).toBe(false);

    const secret = await runAnalysis([fixture("client-env-secrets-risk", "positive.tsx")], defaultConfig);
    expect(secret.some((f) => f.ruleId === "client-env-secrets-risk")).toBe(true);

    const secretNegative = await runAnalysis([fixture("client-env-secrets-risk", "negative.tsx")], defaultConfig);
    expect(secretNegative.some((f) => f.ruleId === "client-env-secrets-risk")).toBe(false);
  });
});

describe("docs coverage matrix", () => {
  it("generates matrix and prioritized backlog", () => {
    const matrix = buildDocsCoverageMatrix(defaultConfig);
    const backlog = buildCoverageBacklog(matrix);

    expect(matrix.length).toBeGreaterThan(0);
    expect(backlog.every((row) => row.status !== "covered")).toBe(true);
  });
});
