import { ESLint } from "eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import type { Finding, Severity, RuleId } from "../types/findings.js";
import type { ReactLensConfig } from "../config/defaultConfig.js";

type RuleHelp = {
  why: string;
  suggestion: string;
};

const RULE_HELP: Record<string, RuleHelp> = {
  "react-hooks/rules-of-hooks": {
    why: "Hooks must be called in a stable, predictable order.",
    suggestion:
      "Call hooks unconditionally at the top level of React components and custom hooks.",
  },
  "react-hooks/exhaustive-deps": {
    why: "Missing dependencies can cause stale closures and unexpected behavior.",
    suggestion:
      "Include every referenced value in dependency arrays or refactor the effect logic.",
  },
  "react-hooks/set-state-in-effect": {
    why: "Synchronous state updates in effects often indicate unnecessary effect-driven control flow.",
    suggestion:
      "Prefer deriving values during render or move logic to event handlers when possible.",
  },
  "react-hooks/set-state-in-render": {
    why: "State updates during render can cause infinite loops and unstable render behavior.",
    suggestion: "Move state updates to events, effects, or transitions.",
  },
  "react-hooks/static-components": {
    why: "Component identity should stay stable to preserve compiler and memoization guarantees.",
    suggestion:
      "Hoist component definitions and avoid recreating components during render.",
  },
};

function mapSeverity(
  eslintSeverity: number,
  mode: ReactLensConfig["rolloutMode"],
): Severity | null {
  if (eslintSeverity <= 0) return null;

  if (mode === "strict") {
    return eslintSeverity === 2 ? "error" : "warning";
  }

  if (mode === "report-only") {
    return "info";
  }

  return "warning";
}

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: {
        "react-hooks": reactHooksPlugin as unknown as Plugin,
      },
      rules: reactHooksPlugin.configs.recommended.rules,
    },
  ],
});

export async function runOfficialHooksLint(
  files: string[],
  config: ReactLensConfig,
): Promise<Finding[]> {
  if (config.officialHooksLint === "off" || files.length === 0) {
    return [];
  }

  const results = await eslint.lintFiles(files);
  const findings: Finding[] = [];

  for (const result of results) {
    for (const message of result.messages) {
      if (!message.ruleId?.startsWith("react-hooks/")) continue;

      const severity = mapSeverity(message.severity, config.rolloutMode);
      if (!severity) continue;

      const help = RULE_HELP[message.ruleId];
      findings.push({
        ruleId: (message.ruleId ?? "unknown") as RuleId,
        severity,
        confidence: message.severity >= 2 ? "high" : "medium",
        filePath: result.filePath,
        line: message.line ?? 1,
        column: message.column ?? 1,
        title: `Official React Hooks lint: ${message.ruleId.replace("react-hooks/", "")}`,
        pattern: message.message,
        whyItMatters:
          help?.why ??
          "This violates an official React Hooks best-practice check.",
        suggestion:
          help?.suggestion ??
          "Follow the official lint guidance for this rule.",
        source: "react-hooks-eslint",
      });
    }
  }

  return findings;
}
