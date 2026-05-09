#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "./config/loadConfig.js";
import { findFiles } from "./scanner/findFiles.js";
import { applyMinSeverity, runAnalysis } from "./scanner/runAnalysis.js";
import { formatPretty } from "./formatters/pretty.js";
import { runInteractiveReport } from "./formatters/interactive.js";
import { formatJson } from "./formatters/json.js";
import { formatSarif } from "./formatters/sarif.js";
import type { Severity } from "./types/findings.js";
import type { Lang } from "./i18n/messages.js";
import type { InteractiveTheme } from "./formatters/interactive.js";
import { buildCoverageBacklog, buildDocsCoverageMatrix } from "./docs/coverageMatrix.js";
import { evaluatePerfBudget, type PerfBaseline } from "./perf/budget.js";

function startSpinner(text: string): () => void {
  if (!process.stdout.isTTY) {
    return () => {};
  }

  const frames = ["|", "/", "-", "\\"];
  let i = 0;
  const start = Date.now();

  const timer = setInterval(() => {
    process.stdout.write(`\r${pc.cyan(frames[i % frames.length])} ${text}`);
    i += 1;
  }, 80);

  return () => {
    clearInterval(timer);
    const ms = Date.now() - start;
    process.stdout.write(`\r${pc.green("ok")} ${text} (${ms}ms)\n`);
  };
}

const program = new Command();

program
  .name("react-lens")
  .description("Static React architecture and pattern advisor")
  .argument("[target]", "target directory", ".")
  .option("--format <format>", "pretty|json|sarif", "pretty")
  .option("--lang <lang>", "en or hu", "en")
  .option("--min-severity <level>", "info|suggestion|warning|error", "info")
  .option("--interactive", "render findings in interactive terminal UI (pretty format only)", false)
  .option("--theme <theme>", "interactive theme: noir|paper|amber", "noir")
  .option("--no-animate", "disable terminal animation")
  .option("--coverage-matrix", "print docs coverage matrix and backlog", false)
  .option("--max-runtime-ms <ms>", "fail when runtime exceeds this budget")
  .option("--perf-baseline-file <path>", "json file to read/write perf baseline")
  .option("--max-runtime-growth-percent <percent>", "fail when runtime growth exceeds baseline percentage")
  .option("--update-perf-baseline", "write runtime baseline file after successful run", false)
  .option("--ci", "exit with code 1 when warnings/errors exist", false)
  .action(async (target, options) => {
    const cwd = resolve(process.cwd(), target);
    const config = await loadConfig(cwd);
    if (options.coverageMatrix) {
      const matrix = buildDocsCoverageMatrix(config);
      const backlog = buildCoverageBacklog(matrix);
      console.log(JSON.stringify({ matrix, backlog }, null, 2));
      return;
    }

    const shouldAnimate = Boolean(options.animate) && options.format === "pretty" && !options.ci;
    const stopSpinner = shouldAnimate ? startSpinner("Scanning and analyzing React files...") : () => {};
    const startTime = Date.now();

    const files = await findFiles(config.include, config.ignore, cwd);
    const findings = await runAnalysis(files, config);
    const runtimeMs = Date.now() - startTime;
    stopSpinner();

    const minLevel = options.minSeverity as Severity;
    const filtered = applyMinSeverity(findings, minLevel);

    const lang = (options.lang === "hu" ? "hu" : "en") as Lang;

    if (options.format === "json") {
      console.log(formatJson(filtered));
    } else if (options.format === "sarif") {
      console.log(formatSarif(filtered));
    } else if (options.interactive) {
      const theme = (["noir", "paper", "amber"].includes(options.theme) ? options.theme : "noir") as InteractiveTheme;
      const rendered = await runInteractiveReport(filtered, {
        lang,
        filesScanned: files.length,
        durationMs: runtimeMs,
        projectLabel: target,
        theme
      });
      if (!rendered) {
        console.log(formatPretty(filtered, { lang, filesScanned: files.length }));
      }
    } else {
      console.log(formatPretty(filtered, { lang, filesScanned: files.length }));
    }

    let perfBaseline: PerfBaseline | null = null;
    const perfBaselineFile = options.perfBaselineFile ? resolve(process.cwd(), String(options.perfBaselineFile)) : null;
    if (perfBaselineFile) {
      try {
        const raw = await readFile(perfBaselineFile, "utf8");
        perfBaseline = JSON.parse(raw) as PerfBaseline;
      } catch {
        perfBaseline = null;
      }
    }

    const maxRuntimeMs = options.maxRuntimeMs ? Number(options.maxRuntimeMs) : undefined;
    const maxRuntimeGrowthPercent = options.maxRuntimeGrowthPercent ? Number(options.maxRuntimeGrowthPercent) : undefined;
    const perfResult = evaluatePerfBudget(runtimeMs, {
      maxRuntimeMs,
      maxGrowthPercent: maxRuntimeGrowthPercent,
      baseline: perfBaseline
    });

    if (!perfResult.ok) {
      for (const err of perfResult.errors) {
        console.error(pc.red(`perf: ${err}`));
      }
      process.exit(1);
    }

    if (perfBaselineFile && options.updatePerfBaseline) {
      const payload: PerfBaseline = {
        runtimeMs,
        filesScanned: files.length,
        timestamp: new Date().toISOString(),
        version: 1
      };
      await writeFile(perfBaselineFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      if (options.format === "pretty") {
        console.log(pc.cyan(`perf: baseline updated at ${perfBaselineFile}`));
      }
    }

    if (options.ci) {
      const hasProblem = filtered.some((f) => f.severity === "error" || f.severity === "warning");
      if (hasProblem) process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
