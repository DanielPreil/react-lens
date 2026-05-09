import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { buildFinding } from "./ruleHelpers.js";
import type { Rule, RuleResult } from "./types.js";

function traverse(node: unknown, visit: (n: TSESTree.Node) => void): void {
  if (!node || typeof node !== "object") return;
  const maybeNode = node as Partial<TSESTree.Node>;
  if (typeof maybeNode.type === "string") {
    visit(maybeNode as TSESTree.Node);
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const child of value) traverse(child, visit);
      continue;
    }
    if (value && typeof value === "object") traverse(value, visit);
  }
}

function isHookCall(
  node: TSESTree.CallExpression,
  hookName: "useState" | "useEffect",
): boolean {
  if (node.callee.type === "Identifier") return node.callee.name === hookName;
  if (node.callee.type === "MemberExpression" && !node.callee.computed) {
    return (
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === hookName
    );
  }
  return false;
}

function collectBooleanFlagSetters(ast: TSESTree.Program): Map<string, string> {
  const flags = new Map<string, string>();

  traverse(ast, (node) => {
    if (node.type !== "VariableDeclarator") return;
    if (node.id.type !== "ArrayPattern") return;
    if (!node.init || node.init.type !== "CallExpression") return;
    if (!isHookCall(node.init, "useState")) return;

    const initArg = node.init.arguments[0];
    if (!initArg) return;

    const isBooleanInit =
      (initArg.type === "Literal" && typeof initArg.value === "boolean") ||
      (initArg.type === "Identifier" &&
        (initArg.name === "true" || initArg.name === "false"));

    if (!isBooleanInit) return;

    const stateName = node.id.elements[0];
    const setterName = node.id.elements[1];
    if (stateName?.type === "Identifier" && setterName?.type === "Identifier") {
      flags.set(stateName.name, setterName.name);
    }
  });

  return flags;
}

function getEffectDepNames(node: TSESTree.CallExpression): Set<string> {
  const deps = node.arguments[1];
  if (deps?.type !== "ArrayExpression") return new Set();
  return new Set(
    deps.elements
      .filter((el): el is TSESTree.Identifier => el?.type === "Identifier")
      .map((el) => el.name),
  );
}

function getEffectBodyText(
  original: string,
  callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): string {
  if (!callback.range) return "";
  return original.slice(callback.range[0], callback.range[1]);
}

function hasEarlyReturnGuard(
  callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): boolean {
  if (callback.body.type !== "BlockStatement") return false;
  const first = callback.body.body[0];
  if (!first) return false;
  return (
    first.type === "IfStatement" && first.consequent.type === "ReturnStatement"
  );
}

const EXTERNAL_SIGNAL_RE =
  /\b(fetch|addEventListener|removeEventListener|setInterval|setTimeout|subscribe|observe|postMessage|dispatchEvent|WebSocket|MutationObserver|IntersectionObserver|ResizeObserver)\b/;

const ACTION_SIGNAL_RE =
  /\b(toast|navigate|router\.|push\(|replace\(|redirect\(|mutate\(|submit\(|send\(|trigger\(|dispatch\(|emit\()\b/;

export const effectEventFlagAstRule: Rule = {
  id: "effect-event-flag",
  run: ({ source, rawSource }) => {
    const original = rawSource ?? source;
    let ast: TSESTree.Program;

    try {
      ast = parse(original, {
        jsx: true,
        loc: true,
        range: true,
        comment: true,
        sourceType: "module",
      });
    } catch {
      return [];
    }

    const booleanFlags = collectBooleanFlagSetters(ast);
    if (booleanFlags.size === 0) return [];

    const findings: RuleResult[] = [];

    traverse(ast, (node) => {
      if (node.type !== "CallExpression") return;
      if (!isHookCall(node, "useEffect")) return;

      const callback = node.arguments[0];
      if (
        !callback ||
        (callback.type !== "ArrowFunctionExpression" &&
          callback.type !== "FunctionExpression")
      )
        return;

      const depNames = getEffectDepNames(node);
      if (depNames.size === 0) return;

      const flagDeps = [...depNames].filter((dep) => booleanFlags.has(dep));
      if (flagDeps.length === 0) return;

      const bodyText = getEffectBodyText(original, callback);

      if (EXTERNAL_SIGNAL_RE.test(bodyText)) return;
      if (hasEarlyReturnGuard(callback)) return;
      if (!ACTION_SIGNAL_RE.test(bodyText)) return;

      const index = node.range ? node.range[0] : 0;
      const flagName = flagDeps[0];
      const setterName = booleanFlags.get(flagName) ?? `set${flagName}`;

      findings.push(
        buildFinding(original, index, {
          ruleId: "effect-event-flag",
          confidence: "medium",
          title: "useEffect may be used as an event flag handler",
          pattern: `Boolean flag \`${flagName}\` is in the dependency array and the effect runs an action, not external sync.`,
          whyItMatters:
            "Event-specific logic in effects is harder to reason about and adds an extra render cycle.",
          suggestion: `Move the action directly into the event handler and remove the \`${flagName}\` flag state. Reset with \`${setterName}(false)\` after the action if needed.`,
          whenToIgnore:
            "Ignore if this effect genuinely reacts to an external system, not a UI event.",
        }),
      );
    });

    return findings;
  },
};
