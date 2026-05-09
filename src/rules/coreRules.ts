import type { Rule } from "./types.js";
import { allMatches, buildFinding } from "./ruleHelpers.js";
import { effectDerivedStateAstRule } from "./effectDerivedStateAst.js";
import { asyncEffectRaceAstRule } from "./asyncEffectRaceAst.js";
import { unstableContextValueAstRule } from "./unstableContextValueAst.js";
import {
  hydrationRootMismatchRiskRule,
  rscClientBoundaryRule,
  serializablePropsAcrossBoundaryRule,
  serverFunctionContractRule,
  serverFunctionUntrustedInputRule
} from "./rscSafetyRules.js";
import { clientEnvSecretsRiskRule, dangerousHtmlXssRiskRule } from "./securityRules.js";

const effectEventFlag: Rule = {
  id: "effect-event-flag",
  run: ({ source }) => {
    const pattern = /const\s*\[\s*\w+\s*,\s*set\w+\s*\]\s*=\s*useState\(false\)[\s\S]{0,500}?useEffect\s*\(/g;
    return allMatches(pattern, source).map((m) =>
      buildFinding(source, m.index, {
        ruleId: "effect-event-flag",
        confidence: "medium",
        title: "Effect may be used as an event flag handler",
        pattern: "Boolean state flag plus useEffect trigger pattern detected.",
        whyItMatters: "Event-specific logic in effects is often harder to reason about.",
        suggestion: "Prefer running event actions directly in event handlers."
      })
    );
  }
};

const missingEffectCleanup: Rule = {
  id: "missing-effect-cleanup",
  run: ({ source }) => {
    const effectMatches = allMatches(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]{0,800}?\}\s*,\s*\[[^\]]*\]\s*\)/g, source);
    const out = [];
    for (const m of effectMatches) {
      const block = m[0];
      const registers = /addEventListener|setInterval\(|setTimeout\(|\.subscribe\(|\.observe\(/.test(block);
      const hasCleanup = /return\s*\(\s*\)\s*=>/.test(block);
      if (registers && !hasCleanup) {
        out.push(
          buildFinding(source, m.index, {
            ruleId: "missing-effect-cleanup",
            confidence: "high",
            title: "Effect registers side effects without cleanup",
            pattern: "Listener/timer/subscription registration found without cleanup.",
            whyItMatters: "This can leak resources or trigger stale updates.",
            suggestion: "Return a cleanup function that unsubscribes/removes/disconnects."
          })
        );
      }
    }
    return out;
  }
};

const inlinePropToMemo: Rule = {
  id: "inline-prop-to-memo",
  run: ({ source }) => {
    const memoizedNames = allMatches(/(?:const|function)\s+(\w+)\s*=\s*React\.memo|React\.memo\s*\(\s*function\s+(\w+)/g, source)
      .map((m) => m[1] || m[2])
      .filter(Boolean);

    const out = [];
    for (const name of memoizedNames) {
      const usePattern = new RegExp(`<${name}[^>]*=\\{\\s*(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\}|\\([^)]*\\)\\s*=>)`, "g");
      for (const m of allMatches(usePattern, source)) {
        out.push(
          buildFinding(source, m.index, {
            ruleId: "inline-prop-to-memo",
            confidence: "medium",
            title: "Inline prop passed to memoized component",
            pattern: "Inline object/array/function prop detected on memoized child.",
            whyItMatters: "Reference changes can neutralize React.memo benefits.",
            suggestion: "Hoist static values or memoize references when needed."
          })
        );
      }
    }
    return out;
  }
};

const uselessMemo: Rule = {
  id: "useless-memo",
  run: ({ source }) => {
    const pattern = /useMemo\s*\(\s*\(\)\s*=>\s*([^,]{1,80})\s*,\s*\[[^\]]*\]\s*\)/g;
    const out = [];
    for (const m of allMatches(pattern, source)) {
      const expr = m[1] ?? "";
      const complex = /filter\(|map\(|reduce\(|sort\(|find\(|for\s*\(|while\s*\(/.test(expr);
      if (!complex) {
        out.push(
          buildFinding(source, m.index, {
            ruleId: "useless-memo",
            confidence: "medium",
            title: "Trivial calculation wrapped in useMemo",
            pattern: "useMemo appears to wrap a simple expression.",
            whyItMatters: "Manual memoization can add complexity without real gain.",
            suggestion: "Remove useMemo unless profiling proves this path is expensive.",
            whenToIgnore: "Keep it when it stabilizes a required reference for memoized children."
          })
        );
      }
    }
    return out;
  }
};

const unstableMemoDeps: Rule = {
  id: "unstable-memo-deps",
  run: ({ source }) => {
    const pattern = /use(Memo|Callback)\s*\(\s*[\s\S]*?,\s*\[([^\]]+)\]\s*\)/g;
    const out = [];
    for (const m of allMatches(pattern, source)) {
      const deps = m[2] ?? "";
      if (/\{[^}]*\}|\[[^\]]*\]|\([^)]*\)\s*=>/.test(deps)) {
        out.push(
          buildFinding(source, m.index, {
            ruleId: "unstable-memo-deps",
            confidence: "high",
            title: "Memo hook has unstable dependency",
            pattern: "Inline object/array/function appears inside dependency array.",
            whyItMatters: "Unstable deps can invalidate memoization every render.",
            suggestion: "Move dependency creation outside render or stabilize it first."
          })
        );
      }
    }
    return out;
  }
};

export const coreRules: Rule[] = [
  effectDerivedStateAstRule,
  effectEventFlag,
  asyncEffectRaceAstRule,
  missingEffectCleanup,
  unstableContextValueAstRule,
  inlinePropToMemo,
  uselessMemo,
  unstableMemoDeps,
  rscClientBoundaryRule,
  serverFunctionContractRule,
  serverFunctionUntrustedInputRule,
  serializablePropsAcrossBoundaryRule,
  hydrationRootMismatchRiskRule,
  dangerousHtmlXssRiskRule,
  clientEnvSecretsRiskRule
];
