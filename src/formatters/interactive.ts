import readline from "node:readline";
import { spawn } from "node:child_process";
import pc from "picocolors";
import type { Finding, Severity } from "../types/findings.js";
import { labelSeverity, ruleExamples, ruleNames, ruleTextsHu, type Lang } from "../i18n/messages.js";

type FilterKey = "all" | Severity;
export type InteractiveTheme = "noir" | "paper" | "amber";

type InteractiveState = {
  filter: FilterKey;
  selectedIndex: number;
  statusMessage: string;
  tick: number;
  theme: InteractiveTheme;
};

type ThemePalette = {
  appTitle: string;
  border: [number, number, number];
  label: [number, number, number];
  accent: [number, number, number];
  accentStrong: [number, number, number];
  ok: [number, number, number];
  warn: [number, number, number];
  err: [number, number, number];
  info: [number, number, number];
  dim: [number, number, number];
};

const THEMES: Record<InteractiveTheme, ThemePalette> = {
  noir: {
    appTitle: "NIGHT OPERATOR",
    border: [93, 104, 139],
    label: [112, 225, 255],
    accent: [120, 142, 255],
    accentStrong: [58, 201, 255],
    ok: [84, 214, 121],
    warn: [255, 196, 87],
    err: [255, 116, 116],
    info: [132, 180, 255],
    dim: [128, 141, 173]
  },
  paper: {
    appTitle: "EDITORIAL BRIEF",
    border: [120, 84, 58],
    label: [166, 103, 49],
    accent: [177, 132, 80],
    accentStrong: [94, 71, 45],
    ok: [61, 139, 77],
    warn: [173, 121, 24],
    err: [171, 53, 43],
    info: [58, 97, 155],
    dim: [130, 108, 88]
  },
  amber: {
    appTitle: "TERMINAL OPS",
    border: [175, 126, 26],
    label: [255, 186, 58],
    accent: [255, 150, 41],
    accentStrong: [255, 211, 84],
    ok: [156, 231, 80],
    warn: [255, 189, 52],
    err: [255, 110, 84],
    info: [255, 208, 114],
    dim: [179, 146, 81]
  }
};

const FILTER_ORDER: FilterKey[] = ["all", "error", "warning", "suggestion", "info"];
const THEME_ORDER: InteractiveTheme[] = ["noir", "paper", "amber"];
const ANSI_RE = /\u001B\[[0-9;]*m/g;

function colorRgb(rgb: [number, number, number], text: string): string {
  return `\u001B[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\u001B[0m`;
}

function bgRgb(rgb: [number, number, number], text: string): string {
  return `\u001B[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\u001B[0m`;
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

function truncateVisible(text: string, width: number): string {
  if (visibleLength(text) <= width) return text;
  if (width <= 1) return "…";
  return `${stripAnsi(text).slice(0, Math.max(0, width - 1))}…`;
}

function padVisible(text: string, width: number): string {
  const truncated = truncateVisible(text, width);
  const padding = Math.max(0, width - visibleLength(truncated));
  return `${truncated}${" ".repeat(padding)}`;
}

function wrapPlainText(text: string, width: number): string[] {
  if (width <= 0) return [""];
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }
      if (`${current} ${word}`.length <= width) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

function countBySeverity(findings: Finding[]): Record<Severity, number> {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, suggestion: 0, info: 0 }
  );
}

function iconForSeverity(severity: Severity): string {
  if (severity === "error") return "✕";
  if (severity === "warning") return "⚠";
  if (severity === "suggestion") return "◇";
  return "ℹ";
}

function colorSeverityBadge(theme: ThemePalette, severity: Severity, count: number): string {
  const label = `${iconForSeverity(severity)} ${count} ${labelSeverity(severity, "en")}`;
  if (severity === "error") return colorRgb(theme.err, label);
  if (severity === "warning") return colorRgb(theme.warn, label);
  if (severity === "suggestion") return colorRgb(theme.accentStrong, label);
  return colorRgb(theme.info, label);
}

function filterFindings(findings: Finding[], filter: FilterKey): Finding[] {
  if (filter === "all") return findings;
  return findings.filter((f) => f.severity === filter);
}

function formatFilterChip(
  theme: ThemePalette,
  filter: FilterKey,
  findings: Finding[],
  active: boolean
): string {
  const count = filter === "all" ? findings.length : findings.filter((f) => f.severity === filter).length;
  const label =
    filter === "all"
      ? `All ${count}`
      : `${labelSeverity(filter, "en").slice(0, 1)}${labelSeverity(filter, "en").slice(1).toLowerCase()} ${count}`;

  if (active) {
    return pc.black(bgRgb(theme.accentStrong, ` ${label} `));
  }

  return colorRgb(theme.dim, `[${label}]`);
}

function renderAmbientLine(width: number, theme: ThemePalette, tick: number): string {
  const innerWidth = Math.max(1, width - 4);
  const chars = ["░", "▒", "▓", "▒"];
  let out = "";
  for (let i = 0; i < innerWidth; i += 1) {
    const wave = (i + tick) % chars.length;
    const char = chars[wave];
    const useAccent = (i + tick) % 7 === 0;
    out += useAccent ? colorRgb(theme.accent, char) : colorRgb(theme.dim, char);
  }
  return out;
}

function box(theme: ThemePalette, title: string, width: number, lines: string[]): string[] {
  const innerWidth = Math.max(1, width - 4);
  const titleText = ` ${title} `;
  const fillLen = Math.max(0, width - visibleLength(titleText) - 2);
  const top = `${colorRgb(theme.border, "╭─")}${colorRgb(theme.label, titleText)}${colorRgb(theme.border, "─".repeat(fillLen) + "╮")}`;
  const body = lines.map((line) => `${colorRgb(theme.border, "│ ")}${padVisible(line, innerWidth)}${colorRgb(theme.border, " │")}`);
  const bottom = `${colorRgb(theme.border, "╰")}${colorRgb(theme.border, "─".repeat(Math.max(0, width - 2)))}${colorRgb(theme.border, "╯")}`;
  return [top, ...body, bottom];
}

function normalizeSelected(state: InteractiveState, findings: Finding[]): void {
  const filtered = filterFindings(findings, state.filter);
  if (filtered.length === 0) {
    state.selectedIndex = 0;
    return;
  }
  state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, filtered.length - 1));
}

function selectedFinding(state: InteractiveState, findings: Finding[]): Finding | null {
  const filtered = filterFindings(findings, state.filter);
  return filtered[state.selectedIndex] ?? null;
}

function findNextFilter(current: FilterKey, direction: 1 | -1): FilterKey {
  const currentIndex = FILTER_ORDER.indexOf(current);
  const next = (currentIndex + direction + FILTER_ORDER.length) % FILTER_ORDER.length;
  return FILTER_ORDER[next];
}

function nextTheme(current: InteractiveTheme): InteractiveTheme {
  const currentIndex = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
}

function openFindingLocation(finding: Finding): string {
  const target = `${finding.filePath}:${finding.line}:${finding.column}`;
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      spawn("open", [finding.filePath], { stdio: "ignore", detached: true }).unref();
      return `Opened: ${target}`;
    }
    if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", finding.filePath], { stdio: "ignore", detached: true }).unref();
      return `Opened: ${target}`;
    }
    spawn("xdg-open", [finding.filePath], { stdio: "ignore", detached: true }).unref();
    return `Opened: ${target}`;
  } catch {
    return `Could not open file, location: ${target}`;
  }
}

function copyTextToClipboard(value: string): string {
  try {
    if (process.platform === "darwin") {
      const child = spawn("pbcopy");
      child.stdin.write(value);
      child.stdin.end();
      return "Suggested fix copied to clipboard.";
    }
    if (process.platform === "win32") {
      const child = spawn("clip");
      child.stdin.write(value);
      child.stdin.end();
      return "Suggested fix copied to clipboard.";
    }
    const child = spawn("wl-copy");
    child.stdin.write(value);
    child.stdin.end();
    return "Suggested fix copied to clipboard.";
  } catch {
    return "Clipboard utility not found. Copy manually from details.";
  }
}

function panelHeights(totalHeight: number): { summary: number; filters: number; middle: number; example: number; actions: number } {
  const summary = 10;
  const filters = 3;
  const actions = 3;
  const example = Math.max(5, Math.floor(totalHeight * 0.2));
  const used = summary + filters + actions + example + 4;
  const middle = Math.max(10, totalHeight - used);
  return { summary, filters, middle, example, actions };
}

function renderInteractiveScreen(
  findings: Finding[],
  state: InteractiveState,
  options: { lang: Lang; filesScanned: number; durationMs: number; projectLabel: string }
): string {
  const theme = THEMES[state.theme];
  const columns = Math.max(100, process.stdout.columns ?? 120);
  const rows = Math.max(28, process.stdout.rows ?? 36);
  const heights = panelHeights(rows);

  normalizeSelected(state, findings);
  const filtered = filterFindings(findings, state.filter);
  const selected = selectedFinding(state, findings);
  const sev = countBySeverity(findings);

  const summaryLines = [
    colorRgb(theme.ok, "✓ Scan complete"),
    renderAmbientLine(columns, theme, state.tick),
    `${colorRgb(theme.label, "Project")}     ${options.projectLabel}`,
    `${colorRgb(theme.label, "Files")}       ${options.filesScanned}`,
    `${colorRgb(theme.label, "Findings")}    ${findings.length}`,
    `${colorRgb(theme.label, "Duration")}    ${options.durationMs} ms`,
    "",
    `${colorSeverityBadge(theme, "error", sev.error)}    ${colorSeverityBadge(theme, "warning", sev.warning)}    ${colorSeverityBadge(theme, "suggestion", sev.suggestion)}    ${colorSeverityBadge(theme, "info", sev.info)}`
  ];

  const filtersLine = FILTER_ORDER.map((f) => formatFilterChip(theme, f, findings, f === state.filter)).join("  ");
  const filterPanel = box(theme, "Filters", columns, [filtersLine]);

  const middleWidth = columns;
  const leftWidth = Math.max(42, Math.floor((middleWidth - 3) * 0.48));
  const rightWidth = Math.max(42, middleWidth - leftWidth - 1);

  const leftInnerMax = Math.max(1, leftWidth - 4);
  const findingRows = Math.max(1, heights.middle - 2);
  const leftLines: string[] = [];
  if (filtered.length === 0) {
    leftLines.push(colorRgb(theme.dim, "No findings in this filter."));
  } else {
    for (let i = 0; i < filtered.length && leftLines.length < findingRows; i += 1) {
      const f = filtered[i];
      const marker = i === state.selectedIndex ? colorRgb(theme.accentStrong, "›") : colorRgb(theme.dim, "·");
      const line1 = `${marker} ${iconForSeverity(f.severity)}  ${f.ruleId}`;
      const line2 = `   ${f.filePath}:${f.line}`;
      const line3 = `   ${f.confidence} confidence`;
      leftLines.push(truncateVisible(line1, leftInnerMax));
      if (leftLines.length < findingRows) leftLines.push(truncateVisible(colorRgb(theme.dim, line2), leftInnerMax));
      if (leftLines.length < findingRows) leftLines.push(truncateVisible(colorRgb(theme.dim, line3), leftInnerMax));
      if (leftLines.length < findingRows) leftLines.push("");
    }
  }
  while (leftLines.length < findingRows) leftLines.push("");

  const detailsMax = Math.max(1, rightWidth - 4);
  const detailLines: string[] = [];
  if (!selected) {
    detailLines.push(colorRgb(theme.dim, "Select a finding to see details."));
  } else {
    const textHu = options.lang === "hu" ? ruleTextsHu[selected.ruleId] : undefined;
    const localizedRuleName = ruleNames[options.lang][selected.ruleId] ?? selected.ruleId;
    const title = textHu?.title ?? selected.title;
    const summary = textHu?.pattern ?? selected.pattern;
    const why = textHu?.why ?? selected.whyItMatters;
    const suggestion = textHu?.suggestion ?? selected.suggestion;

    detailLines.push(`${iconForSeverity(selected.severity)} ${title}`);
    detailLines.push(colorRgb(theme.dim, `${localizedRuleName}`));
    detailLines.push(colorRgb(theme.dim, `${selected.confidence} confidence · ${selected.source ?? "react-lens"}`));
    detailLines.push("");
    detailLines.push(colorRgb(theme.label, "Location"));
    detailLines.push(`${selected.filePath}:${selected.line}:${selected.column}`);
    detailLines.push("");
    detailLines.push(colorRgb(theme.label, "Summary"));
    detailLines.push(...wrapPlainText(summary, detailsMax));
    detailLines.push("");
    detailLines.push(colorRgb(theme.label, "Why it matters"));
    detailLines.push(...wrapPlainText(why, detailsMax));
    detailLines.push("");
    detailLines.push(colorRgb(theme.label, "Suggested fix"));
    detailLines.push(...wrapPlainText(suggestion, detailsMax));
  }
  const detailRows = Math.max(1, heights.middle - 2);
  const detailFilled = detailLines.slice(0, detailRows);
  while (detailFilled.length < detailRows) detailFilled.push("");

  const leftPanel = box(theme, "Findings", leftWidth, leftLines);
  const rightPanel = box(theme, "Details", rightWidth, detailFilled);
  const middlePanel = leftPanel.map((line, idx) => `${line} ${rightPanel[idx] ?? ""}`);

  const exampleLines: string[] = [];
  if (!selected) {
    exampleLines.push(colorRgb(theme.dim, "No example available."));
  } else {
    const example = selected.exampleFix ?? ruleExamples[options.lang][selected.ruleId] ?? "// No example available.";
    for (const rawLine of example.split("\n")) {
      exampleLines.push(rawLine);
    }
  }
  const exampleRows = Math.max(1, heights.example - 2);
  const exampleFilled: string[] = [];
  for (const line of exampleLines) {
    const wrapped = wrapPlainText(line, Math.max(1, columns - 4));
    for (const w of wrapped) {
      if (exampleFilled.length < exampleRows) exampleFilled.push(w);
    }
  }
  while (exampleFilled.length < exampleRows) exampleFilled.push("");
  const examplePanel = box(theme, "Example", columns, exampleFilled);

  const actionText = "↑/↓ select  ·  tab filters  ·  enter details  ·  o open file  ·  c copy fix  ·  t switch theme  ·  q quit";
  const statusText = state.statusMessage ? colorRgb(theme.dim, state.statusMessage) : colorRgb(theme.dim, "Ready");
  const actionsPanel = box(theme, "Actions", columns, [actionText, statusText]);

  const topTitle = `React Lens · ${theme.appTitle}`;
  const topPanel = box(theme, topTitle, columns, summaryLines.slice(0, Math.max(1, heights.summary - 2)));

  return [
    "\x1b[2J\x1b[H",
    ...topPanel,
    "",
    ...filterPanel,
    "",
    ...middlePanel,
    "",
    ...examplePanel,
    "",
    ...actionsPanel
  ].join("\n");
}

export async function runInteractiveReport(
  findings: Finding[],
  options: {
    lang: Lang;
    filesScanned: number;
    durationMs: number;
    projectLabel: string;
    theme?: InteractiveTheme;
  }
): Promise<boolean> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    return false;
  }

  const state: InteractiveState = {
    filter: "all",
    selectedIndex: 0,
    statusMessage: "",
    tick: 0,
    theme: options.theme ?? "noir"
  };

  const previousRawMode = process.stdin.isRaw;
  readline.emitKeypressEvents(process.stdin);
  process.stdout.write("\x1b[?25l");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const repaint = (): void => {
    process.stdout.write(renderInteractiveScreen(findings, state, options));
  };

  const shimmerTimer = setInterval(() => {
    state.tick = (state.tick + 1) % 10_000;
    repaint();
  }, 180);

  repaint();

  await new Promise<void>((resolve) => {
    const onKeypress = (_str: string, key: readline.Key): void => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        return;
      }

      switch (key.name) {
        case "up":
          state.selectedIndex -= 1;
          break;
        case "down":
          state.selectedIndex += 1;
          break;
        case "tab":
          state.filter = findNextFilter(state.filter, key.shift ? -1 : 1);
          state.selectedIndex = 0;
          break;
        case "left":
          state.filter = findNextFilter(state.filter, -1);
          state.selectedIndex = 0;
          break;
        case "right":
          state.filter = findNextFilter(state.filter, 1);
          state.selectedIndex = 0;
          break;
        case "return":
          state.statusMessage = "Detail pane synchronized with selection.";
          break;
        case "t":
          state.theme = nextTheme(state.theme);
          state.statusMessage = `Theme switched to: ${state.theme}`;
          break;
        case "o": {
          const selected = selectedFinding(state, findings);
          state.statusMessage = selected ? openFindingLocation(selected) : "No finding selected.";
          break;
        }
        case "c": {
          const selected = selectedFinding(state, findings);
          if (!selected) {
            state.statusMessage = "No finding selected.";
          } else {
            const textHu = options.lang === "hu" ? ruleTextsHu[selected.ruleId] : undefined;
            const suggestion = textHu?.suggestion ?? selected.suggestion;
            state.statusMessage = copyTextToClipboard(suggestion);
          }
          break;
        }
        case "q":
        case "escape":
          cleanup();
          return;
        default:
          break;
      }
      normalizeSelected(state, findings);
      repaint();
    };

    const onResize = (): void => {
      repaint();
    };

    const cleanup = (): void => {
      clearInterval(shimmerTimer);
      process.stdin.off("keypress", onKeypress);
      process.stdout.off("resize", onResize);
      process.stdin.setRawMode(Boolean(previousRawMode));
      process.stdout.write("\x1b[?25h\n");
      resolve();
    };

    process.stdin.on("keypress", onKeypress);
    process.stdout.on("resize", onResize);
  });

  return true;
}

export const interactiveInternals = {
  filterFindings,
  findNextFilter,
  wrapPlainText
};
