import { readFile } from "node:fs/promises";
import type { ReactLensConfig } from "../config/defaultConfig.js";
import type { Finding, Severity } from "../types/findings.js";
import { coreRules } from "../rules/coreRules.js";
import { sanitizeForRegexRules } from "../utils/sanitize.js";
import { runOfficialHooksLint } from "./runOfficialHooksLint.js";
import { buildFingerprint } from "./fingerprints.js";

const rank: Record<Severity, number> = {
  error: 4,
  warning: 3,
  suggestion: 2,
  info: 1,
};

function extractSnippet(source: string, line: number, context = 2): string {
  const lines = source.split("\n");
  const start = Math.max(0, line - 1 - context);
  const end = Math.min(lines.length - 1, line - 1 + context);
  return lines
    .slice(start, end + 1)
    .map((l, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === line ? ">" : " ";
      return `${marker} ${String(lineNum).padStart(3)} │ ${l}`;
    })
    .join("\n");
}

export async function runAnalysis(
  files: string[],
  config: ReactLensConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const officialFindings = await runOfficialHooksLint(files, config);
  findings.push(...officialFindings);

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const sanitizedSource = sanitizeForRegexRules(source);

    for (const rule of coreRules) {
      const level = config.rules[rule.id];
      if (!level || level === "off") continue;

      const results = rule.run({
        filePath,
        source: sanitizedSource,
        rawSource: source,
        reactCompilerMode: config.reactCompiler,
        reactEnvironment: config.reactEnvironment,
      });

      for (const result of results) {
        findings.push({
          ...result,
          severity: level,
          filePath,
          source: result.source ?? "react-lens",
          codeSnippet: extractSnippet(source, result.line),
        });
      }
    }
  }

  const deduped = dedupeFindings(findings).map((finding) => ({
    ...finding,
    fingerprint: finding.fingerprint ?? buildFingerprint(finding),
  }));

  return deduped.sort((a, b) => {
    const sev = rank[b.severity] - rank[a.severity];
    if (sev !== 0) return sev;
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    return a.line - b.line;
  });
}

function dedupeFindings(items: Finding[]): Finding[] {
  const map = new Map<string, Finding>();
  for (const finding of items) {
    const enriched = {
      ...finding,
      source: finding.source ?? "react-lens",
      fingerprint: finding.fingerprint ?? buildFingerprint(finding),
    };
    const key = enriched.fingerprint;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, enriched);
      continue;
    }
    const severityDelta = rank[enriched.severity] - rank[existing.severity];
    if (severityDelta > 0) {
      map.set(key, enriched);
      continue;
    }
    if (severityDelta < 0) {
      continue;
    }
    const confidenceRank = { high: 3, medium: 2, low: 1 };
    if (
      confidenceRank[enriched.confidence] > confidenceRank[existing.confidence]
    ) {
      map.set(key, enriched);
      continue;
    }
    if (existing.source !== "react-lens" && enriched.source === "react-lens") {
      map.set(key, enriched);
    }
  }
  return Array.from(map.values());
}

export function applyMinSeverity(
  findings: Finding[],
  min: Severity,
): Finding[] {
  const threshold = rank[min];
  return findings.filter((f) => rank[f.severity] >= threshold);
}
