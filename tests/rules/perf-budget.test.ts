import { describe, expect, it } from "vitest";
import { evaluatePerfBudget } from "../../src/perf/budget.js";

describe("performance budget evaluation", () => {
  it("passes within absolute runtime budget", () => {
    const result = evaluatePerfBudget(120, { maxRuntimeMs: 150 });
    expect(result.ok).toBe(true);
  });

  it("fails when absolute runtime budget is exceeded", () => {
    const result = evaluatePerfBudget(220, { maxRuntimeMs: 150 });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Runtime budget exceeded");
  });

  it("fails when runtime growth exceeds baseline percentage", () => {
    const result = evaluatePerfBudget(145, {
      baseline: {
        runtimeMs: 100,
        filesScanned: 10,
        timestamp: new Date().toISOString(),
        version: 1
      },
      maxGrowthPercent: 30
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Runtime growth budget exceeded");
  });
});
