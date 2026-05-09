import type { Finding } from "../types/findings.js";

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function ruleGroup(ruleId: string): string {
  if (ruleId === "effect-derived-state" || ruleId === "react-hooks/set-state-in-effect") {
    return "derived-state-in-effect";
  }
  return ruleId;
}

export function buildFingerprint(finding: Finding): string {
  const payload = [
    finding.filePath,
    ruleGroup(finding.ruleId),
    finding.line,
    finding.column
  ].join("|");

  return hashText(payload);
}
