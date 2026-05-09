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
    if (value && typeof value === "object") {
      traverse(value, visit);
    }
  }
}

function isHookCall(
  node: TSESTree.CallExpression,
  hookName: "useState" | "useEffect",
): boolean {
  if (node.callee.type === "Identifier") {
    return node.callee.name === hookName;
  }

  if (node.callee.type === "MemberExpression" && !node.callee.computed) {
    return (
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === hookName
    );
  }

  return false;
}

function getFunctionBodyRange(
  fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): [number, number] | null {
  if (!fn.range) return null;
  if (fn.body.type === "BlockStatement" && fn.body.range) {
    return [fn.body.range[0], fn.body.range[1]];
  }
  return [fn.range[0], fn.range[1]];
}

function collectStateSetters(ast: TSESTree.Program): Set<string> {
  const setters = new Set<string>();

  traverse(ast, (node) => {
    if (node.type !== "VariableDeclarator") return;
    if (node.id.type !== "ArrayPattern") return;
    if (!node.init || node.init.type !== "CallExpression") return;
    if (!isHookCall(node.init, "useState")) return;

    const setterNode = node.id.elements[1];
    if (setterNode?.type === "Identifier") {
      setters.add(setterNode.name);
    }
  });

  return setters;
}

function findSetterCallsInEffectBody(
  fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
  setters: Set<string>,
): TSESTree.CallExpression[] {
  const calls: TSESTree.CallExpression[] = [];

  const visitNode = (node: TSESTree.Node, allowNested: boolean): void => {
    if (
      !allowNested &&
      (node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression")
    ) {
      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      setters.has(node.callee.name)
    ) {
      const firstArg = node.arguments[0];
      const updaterFnArg =
        firstArg?.type === "FunctionExpression" ||
        firstArg?.type === "ArrowFunctionExpression";

      if (!updaterFnArg) {
        calls.push(node);
      }
    }

    const nodeObject = node as unknown as Record<string, unknown>;
    for (const value of Object.values(nodeObject)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (
            child &&
            typeof child === "object" &&
            "type" in (child as Record<string, unknown>)
          ) {
            visitNode(child as TSESTree.Node, false);
          }
        }
        continue;
      }

      if (
        value &&
        typeof value === "object" &&
        "type" in (value as Record<string, unknown>)
      ) {
        visitNode(value as TSESTree.Node, false);
      }
    }
  };

  if (fn.body.type === "BlockStatement") {
    visitNode(fn.body, true);
  }

  return calls;
}

function buildDerivedStateFinding(
  source: string,
  node: TSESTree.CallExpression,
  confidence: "high" | "medium",
): RuleResult {
  const index = node.range ? node.range[0] : 0;
  return buildFinding(source, index, {
    ruleId: "effect-derived-state",
    confidence,
    title: "Derived state may be synchronized with useEffect",
    pattern:
      "A useState setter is called inside useEffect to mirror render-available data.",
    whyItMatters:
      "This usually adds an extra render pass and can create stale state bugs.",
    suggestion:
      "Compute the value during render. Keep useMemo only for genuinely expensive calculations.",
    whenToIgnore:
      "Ignore when the Effect is intentionally syncing with an external system, not deriving UI state.",
    exampleFix: "const fullName = `${firstName} ${lastName}`;",
  });
}

export const effectDerivedStateAstRule: Rule = {
  id: "effect-derived-state",
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

    const setters = collectStateSetters(ast);
    if (setters.size === 0) return [];

    const findings: RuleResult[] = [];

    traverse(ast, (node) => {
      if (node.type !== "CallExpression") return;
      if (!isHookCall(node, "useEffect")) return;

      const callback = node.arguments[0];
      if (!callback) return;
      if (
        callback.type !== "ArrowFunctionExpression" &&
        callback.type !== "FunctionExpression"
      )
        return;

      const bodyRange = getFunctionBodyRange(callback);
      if (!bodyRange) return;

      const effectText = original.slice(bodyRange[0], bodyRange[1]);
      const hasAsyncSignals =
        callback.async || /\bawait\b|\.then\s*\(/.test(effectText);
      const hasExternalSignals =
        /\b(fetch|addEventListener|removeEventListener|setInterval|setTimeout|subscribe|observe|postMessage|dispatchEvent)\b/.test(
          effectText,
        );

      if (hasAsyncSignals || hasExternalSignals) {
        return;
      }

      const deps = node.arguments[1];
      const hasDependencies =
        deps?.type === "ArrayExpression" && deps.elements.length > 0;
      const setterCalls = findSetterCallsInEffectBody(callback, setters);

      if (setterCalls.length === 0) {
        return;
      }

      const confidence: "high" | "medium" =
        hasDependencies && setterCalls.length === 1 ? "high" : "medium";
      findings.push(
        buildDerivedStateFinding(original, setterCalls[0], confidence),
      );
    });

    return findings;
  },
};
