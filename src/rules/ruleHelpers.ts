import type { RuleResult } from "./types.js";
import { indexToLineColumn } from "../utils/text.js";

export function buildFinding(source: string, index: number, finding: Omit<RuleResult, "line" | "column">): RuleResult {
  const { line, column } = indexToLineColumn(source, index);
  return { ...finding, line, column };
}

export function allMatches(re: RegExp, source: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const clone = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let m: RegExpExecArray | null = clone.exec(source);
  while (m) {
    out.push(m);
    m = clone.exec(source);
  }
  return out;
}
