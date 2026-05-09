import pc from "picocolors";
import type { Finding } from "../types/findings.js";
import {
  labelSeverity,
  ruleExamples,
  ruleGuides,
  ruleNames,
  ruleTextsHu,
  type Lang,
  ui,
} from "../i18n/messages.js";

function colorSeverity(severity: Finding["severity"], label: string): string {
  if (severity === "error") return pc.bgRed(pc.black(` ${label} `));
  if (severity === "warning") return pc.bgYellow(pc.black(` ${label} `));
  if (severity === "suggestion") return pc.bgCyan(pc.black(` ${label} `));
  return pc.bgBlue(pc.white(` ${label} `));
}

function countBySeverity(
  findings: Finding[],
): Record<Finding["severity"], number> {
  return findings.reduce(
    (acc, f) => {
      acc[f.severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, suggestion: 0, info: 0 },
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TECH_TERMS = [
  "React.memo",
  "useEffect",
  "useMemo",
  "useCallback",
  "AbortController",
  "dependency",
  "Provider",
  "props",
  "state",
  "cleanup",
  "render",
  "stale",
  "setState",
  "inline",
  "Context",
  "value",
];
const SORTED_TERMS = [...TECH_TERMS].sort((a, b) => b.length - a.length);

function markTechTerms(text: string): string {
  const segments = text.split("`");
  for (let i = 0; i < segments.length; i += 2) {
    let segment = segments[i];
    for (const term of SORTED_TERMS) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "g");
      segment = segment.replace(re, `\`${term}\``);
    }
    segments[i] = segment;
  }
  return segments.join("`");
}

function colorInlineCode(text: string): string {
  return text.replace(/`([^`]+)`/g, (_, inner: string) =>
    pc.magenta(`\`${inner}\``),
  );
}

function fmt(text: string): string {
  return colorInlineCode(markTechTerms(text));
}

function confidenceDot(confidence: Finding["confidence"]): string {
  if (confidence === "high") return pc.red("●");
  if (confidence === "medium") return pc.yellow("●");
  return pc.dim("●");
}

function shortPath(filePath: string): string {
  const srcIdx = filePath.indexOf("/src/");
  return srcIdx !== -1 ? filePath.slice(srcIdx + 1) : filePath;
}

export function formatPretty(
  findings: Finding[],
  options: { lang?: Lang; filesScanned?: number } = {},
): string {
  const lang = options.lang ?? "en";
  const t = ui[lang];

  const topBorder = pc.cyan("┏" + "━".repeat(84) + "┓");
  const bottomBorder = pc.cyan("┗" + "━".repeat(84) + "┛");

  if (findings.length === 0) {
    return [
      topBorder,
      `${pc.cyan("┃")} ${pc.bold(t.reportTitle)}${" ".repeat(Math.max(1, 83 - t.reportTitle.length))}${pc.cyan("┃")}`,
      `${pc.cyan("┃")} ${pc.green(t.noFindings)}${" ".repeat(Math.max(1, 83 - t.noFindings.length))}${pc.cyan("┃")}`,
      bottomBorder,
    ].join("\n");
  }

  const sev = countBySeverity(findings);
  const summaryLine = `${t.findings}: ${findings.length}  |  ${labelSeverity("error", lang)}: ${sev.error}  ${labelSeverity("warning", lang)}: ${sev.warning}  ${labelSeverity("suggestion", lang)}: ${sev.suggestion}  ${labelSeverity("info", lang)}: ${sev.info}`;
  const fileLine = `${t.filesScanned}: ${options.filesScanned ?? "-"}`;

  const chunks = findings.map((f, idx) => {
    const sevLabel = colorSeverity(f.severity, labelSeverity(f.severity, lang));
    const textHu = lang === "hu" ? ruleTextsHu[f.ruleId] : undefined;
    const localizedRuleName = ruleNames[lang][f.ruleId] ?? f.ruleId;

    const title = textHu?.title ?? f.title;
    const why = textHu?.why ?? f.whyItMatters;
    const suggested = textHu?.suggestion ?? f.suggestion;
    const ignore = textHu?.whenIgnore ?? f.whenToIgnore;
    const guide = ruleGuides[f.ruleId]?.[lang] ?? [];
    const example = f.exampleFix ?? ruleExamples[lang][f.ruleId] ?? null;

    const lines: string[] = [
      pc.cyan("┌" + "─".repeat(84)),

      `${pc.cyan("│")} ${pc.bold(`#${idx + 1}`)}  ${sevLabel}  ${confidenceDot(f.confidence)} ${pc.dim(f.confidence)}  ${pc.dim("─")}  ${pc.cyan(localizedRuleName)}`,
      `${pc.cyan("│")} ${pc.dim(shortPath(f.filePath))}${pc.dim(":" + f.line + ":" + f.column)}`,

      pc.cyan("│"),

      `${pc.cyan("│")} ${pc.bold(fmt(title))}`,
      `${pc.cyan("│")} ${pc.dim(fmt(why))}`,

      pc.cyan("│"),
    ];

    if (f.codeSnippet) {
      lines.push(
        `${pc.cyan("│")} ${pc.dim(lang === "hu" ? "Jelenlegi kód:" : "Current code:")}`,
      );
      for (const l of f.codeSnippet.split("\n")) {
        const isHighlighted = l.startsWith(">");
        lines.push(
          `${pc.cyan("│")} ${isHighlighted ? pc.yellow(l) : pc.dim(l)}`,
        );
      }
      lines.push(pc.cyan("│"));
    }

    if (example) {
      lines.push(
        `${pc.cyan("│")} ${pc.dim(lang === "hu" ? "Javasolt megoldás:" : "Suggested fix:")}`,
      );
      for (const l of example.split("\n")) {
        lines.push(`${pc.cyan("│")} ${pc.green(l)}`);
      }
      lines.push(pc.cyan("│"));
    }

    if (guide.length > 0) {
      lines.push(`${pc.cyan("│")} ${pc.dim(t.fixSteps + ":")}`);
      for (const [i, step] of guide.entries()) {
        lines.push(`${pc.cyan("│")}   ${pc.dim(`${i + 1}.`)} ${fmt(step)}`);
      }
      lines.push(pc.cyan("│"));
    }

    if (ignore) {
      lines.push(`${pc.cyan("│")} ${pc.dim("💡 " + fmt(ignore))}`);
    }

    if (f.source && f.source !== "react-lens") {
      lines.push(`${pc.cyan("│")} ${pc.dim(`source: ${f.source}`)}`);
    }

    lines.push(pc.cyan("└" + "─".repeat(84)));

    return lines.join("\n");
  });

  return [
    topBorder,
    `${pc.cyan("┃")} ${pc.bold(t.reportTitle)}${" ".repeat(Math.max(1, 83 - t.reportTitle.length))}${pc.cyan("┃")}`,
    `${pc.cyan("┃")} ${colorInlineCode(markTechTerms(summaryLine))}${" ".repeat(Math.max(1, 83 - summaryLine.length))}${pc.cyan("┃")}`,
    `${pc.cyan("┃")} ${colorInlineCode(markTechTerms(fileLine))}${" ".repeat(Math.max(1, 83 - fileLine.length))}${pc.cyan("┃")}`,
    bottomBorder,
    "",
    ...chunks,
  ].join("\n");
}
