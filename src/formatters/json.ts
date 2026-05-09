import type { Finding } from "../types/findings.js";

export function formatJson(findings: Finding[]): string {
  return JSON.stringify(findings, null, 2);
}
