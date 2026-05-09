import { describe, expect, it } from "vitest";
import { interactiveInternals } from "../../src/formatters/interactive.js";
import type { Finding } from "../../src/types/findings.js";

const sampleFindings: Finding[] = [
  {
    ruleId: "effect-derived-state",
    severity: "warning",
    confidence: "high",
    filePath: "/tmp/a.tsx",
    line: 1,
    column: 1,
    title: "A",
    pattern: "A",
    whyItMatters: "A",
    suggestion: "A"
  },
  {
    ruleId: "dangerous-html-xss-risk",
    severity: "error",
    confidence: "high",
    filePath: "/tmp/b.tsx",
    line: 2,
    column: 1,
    title: "B",
    pattern: "B",
    whyItMatters: "B",
    suggestion: "B"
  }
];

describe("interactive formatter internals", () => {
  it("filters findings by severity", () => {
    const warnings = interactiveInternals.filterFindings(sampleFindings, "warning");
    const errors = interactiveInternals.filterFindings(sampleFindings, "error");

    expect(warnings).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(warnings[0].ruleId).toBe("effect-derived-state");
    expect(errors[0].ruleId).toBe("dangerous-html-xss-risk");
  });

  it("cycles filters in both directions", () => {
    expect(interactiveInternals.findNextFilter("all", 1)).toBe("error");
    expect(interactiveInternals.findNextFilter("all", -1)).toBe("info");
  });

  it("wraps long text into multiple lines", () => {
    const wrapped = interactiveInternals.wrapPlainText("alpha beta gamma delta", 10);
    expect(wrapped.length).toBeGreaterThan(1);
  });
});
