export type PerfBaseline = {
  runtimeMs: number;
  filesScanned: number;
  timestamp: string;
  version: 1;
};

export type PerfCheckOptions = {
  maxRuntimeMs?: number;
  maxGrowthPercent?: number;
  baseline?: PerfBaseline | null;
};

export type PerfCheckResult = {
  ok: boolean;
  errors: string[];
};

export function evaluatePerfBudget(runtimeMs: number, options: PerfCheckOptions): PerfCheckResult {
  const errors: string[] = [];

  if (typeof options.maxRuntimeMs === "number" && runtimeMs > options.maxRuntimeMs) {
    errors.push(`Runtime budget exceeded: ${runtimeMs}ms > ${options.maxRuntimeMs}ms.`);
  }

  if (options.baseline && typeof options.maxGrowthPercent === "number") {
    const growthLimit = options.baseline.runtimeMs * (1 + options.maxGrowthPercent / 100);
    if (runtimeMs > growthLimit) {
      errors.push(
        `Runtime growth budget exceeded: ${runtimeMs}ms > ${growthLimit.toFixed(1)}ms (baseline ${options.baseline.runtimeMs}ms, +${options.maxGrowthPercent}%).`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
