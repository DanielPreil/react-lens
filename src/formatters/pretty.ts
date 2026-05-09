import pc from "picocolors";
import type { Finding } from "../types/findings.js";
import {
  labelSeverity,
  ruleExamples,
  ruleGuides,
  ruleNames,
  ruleTextsHu,
  type Lang,
  ui
} from "../i18n/messages.js";

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
  "value"
];
const SORTED_TERMS = [...TECH_TERMS].sort((a, b) => b.length - a.length);

function colorSeverity(severity: Finding["severity"], label: string): string {
  if (severity === "error") return pc.bgRed(pc.black(` ${label} `));
  if (severity === "warning") return pc.bgYellow(pc.black(` ${label} `));
  if (severity === "suggestion") return pc.bgCyan(pc.black(` ${label} `));
  return pc.bgBlue(pc.white(` ${label} `));
}

function countBySeverity(findings: Finding[]): Record<Finding["severity"], number> {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, suggestion: 0, info: 0 }
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  return text.replace(/`([^`]+)`/g, (_, inner: string) => pc.magenta(`\`${inner}\``));
}

function formatLine(label: string, value: string): string {
  return `${pc.dim(label)}: ${colorInlineCode(markTechTerms(value))}`;
}

function fallbackGuide(lang: Lang): string[] {
  if (lang === "hu") {
    return [
      "Nézd meg a szabály által jelzett mintát a fájlban.",
      "Alkalmazd a hivatalos React iránymutatást erre az esetre.",
      "Refaktor után ellenőrizd újra a viselkedést.",
      "Futtasd újra az elemzést és a teszteket."
    ];
  }
  return [
    "Inspect the highlighted pattern in the file.",
    "Apply the official React guidance for this case.",
    "Re-check behavior after refactoring.",
    "Re-run analysis and tests."
  ];
}

export function formatPretty(
  findings: Finding[],
  options: {
    lang?: Lang;
    filesScanned?: number;
  } = {}
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
      bottomBorder
    ].join("\n");
  }

  const sev = countBySeverity(findings);
  const summaryLine = `${t.findings}: ${findings.length}  |  ${labelSeverity("error", lang)}: ${sev.error}  ${labelSeverity("warning", lang)}: ${sev.warning}  ${labelSeverity("suggestion", lang)}: ${sev.suggestion}  ${labelSeverity("info", lang)}: ${sev.info}`;
  const fileLine = `${t.filesScanned}: ${options.filesScanned ?? "-"}`;

  const chunks = findings.map((f, idx) => {
    const sevLabel = colorSeverity(f.severity, labelSeverity(f.severity, lang));
    const guide = ruleGuides[f.ruleId]?.[lang] ?? fallbackGuide(lang);
    const localizedRuleName = ruleNames[lang][f.ruleId] ?? f.ruleId;
    const textHu = lang === "hu" ? ruleTextsHu[f.ruleId] : undefined;

    const title = textHu?.title ?? f.title;
    const pattern = textHu?.pattern ?? f.pattern;
    const why = textHu?.why ?? f.whyItMatters;
    const suggested = textHu?.suggestion ?? f.suggestion;
    const ignore = textHu?.whenIgnore ?? f.whenToIgnore;
    const example = f.exampleFix ?? ruleExamples[lang][f.ruleId] ?? "// No example available.";

    const lines = [
      `${pc.cyan("┌" + "─".repeat(84))}`,
      `${pc.cyan("│")} ${pc.bold(`#${idx + 1}`)} ${sevLabel} ${pc.dim(f.filePath + ":" + f.line + ":" + f.column)}`,
      `${pc.cyan("│")} ${pc.dim(t.rule)}: ${pc.white(f.ruleId)}`,
      `${pc.cyan("│")} ${pc.dim("Source")}: ${pc.white(f.source ?? "react-lens")}`,
      `${pc.cyan("│")} ${formatLine(t.ruleName, localizedRuleName)}`,
      `${pc.cyan("│")} ${formatLine(t.title, title)}`,
      `${pc.cyan("│")} ${formatLine(t.pattern, pattern)}`,
      `${pc.cyan("│")} ${formatLine(t.why, why)}`,
      `${pc.cyan("│")} ${formatLine(t.suggestedFix, suggested)}`,
      `${pc.cyan("│")} ${formatLine(t.confidence, f.confidence)}`,
      ignore ? `${pc.cyan("│")} ${formatLine(t.whenIgnore, ignore)}` : "",
      `${pc.cyan("│")} ${pc.dim(t.fixSteps)}:`,
      `${pc.cyan("│")}   1. ${colorInlineCode(markTechTerms(guide[0]))}`,
      `${pc.cyan("│")}   2. ${colorInlineCode(markTechTerms(guide[1]))}`,
      `${pc.cyan("│")}   3. ${colorInlineCode(markTechTerms(guide[2]))}`,
      `${pc.cyan("│")}   4. ${colorInlineCode(markTechTerms(guide[3]))}`,
      `${pc.cyan("│")} ${pc.dim(t.fixExample)}:`,
      `${pc.cyan("│")} ${pc.gray("```tsx")}`,
      ...example.split("\n").map((line) => `${pc.cyan("│")} ${pc.white(line)}`),
      `${pc.cyan("│")} ${pc.gray("```")}`,
      `${pc.cyan("└" + "─".repeat(84))}`
    ].filter(Boolean);

    return lines.join("\n");
  });

  return [
    topBorder,
    `${pc.cyan("┃")} ${pc.bold(t.reportTitle)}${" ".repeat(Math.max(1, 83 - t.reportTitle.length))}${pc.cyan("┃")}`,
    `${pc.cyan("┃")} ${colorInlineCode(markTechTerms(summaryLine))}${" ".repeat(Math.max(1, 83 - summaryLine.length))}${pc.cyan("┃")}`,
    `${pc.cyan("┃")} ${colorInlineCode(markTechTerms(fileLine))}${" ".repeat(Math.max(1, 83 - fileLine.length))}${pc.cyan("┃")}`,
    bottomBorder,
    "",
    ...chunks
  ].join("\n");
}
