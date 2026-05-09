import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { buildFinding } from "./ruleHelpers.js";
import type { Rule, RuleResult } from "./types.js";

function traverse(node: unknown, visit: (n: TSESTree.Node) => void): void {
  if (!node || typeof node !== "object") return;
  const maybeNode = node as Partial<TSESTree.Node>;
  if (typeof maybeNode.type === "string") visit(maybeNode as TSESTree.Node);
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const child of value) traverse(child, visit);
      continue;
    }
    if (value && typeof value === "object") traverse(value, visit);
  }
}

function isUseEffect(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === "Identifier")
    return node.callee.name === "useEffect";
  if (node.callee.type === "MemberExpression" && !node.callee.computed) {
    return (
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "useEffect"
    );
  }
  return false;
}

const REGISTRATION_CALLS = new Set([
  "addEventListener",
  "setInterval",
  "setTimeout",
  "subscribe",
  "observe",
  "on",
  "addListener",
  "connect",
  "open",
]);

function hasRegistrationCall(body: TSESTree.BlockStatement): boolean {
  let found = false;
  traverse(body, (node) => {
    if (found) return;
    if (node.type !== "CallExpression") return;
    const callee = node.callee;
    if (
      callee.type === "MemberExpression" &&
      callee.property.type === "Identifier"
    ) {
      if (REGISTRATION_CALLS.has(callee.property.name)) found = true;
    }
    if (callee.type === "Identifier" && REGISTRATION_CALLS.has(callee.name))
      found = true;
  });
  return found;
}

function hasCleanupReturn(body: TSESTree.BlockStatement): boolean {
  for (const stmt of body.body) {
    if (stmt.type !== "ReturnStatement" || !stmt.argument) continue;
    const arg = stmt.argument;
    if (
      arg.type === "ArrowFunctionExpression" ||
      arg.type === "FunctionExpression"
    )
      return true;
  }
  return false;
}

export const missingEffectCleanupAstRule: Rule = {
  id: "missing-effect-cleanup",
  run: ({ source, rawSource }) => {
    const original = rawSource ?? source;
    let ast: TSESTree.Program;
    try {
      ast = parse(original, {
        jsx: true,
        loc: true,
        range: true,
        sourceType: "module",
      });
    } catch {
      return [];
    }

    const findings: RuleResult[] = [];

    traverse(ast, (node) => {
      if (node.type !== "CallExpression") return;
      if (!isUseEffect(node)) return;

      const callback = node.arguments[0];
      if (
        !callback ||
        (callback.type !== "ArrowFunctionExpression" &&
          callback.type !== "FunctionExpression")
      )
        return;
      if (callback.body.type !== "BlockStatement") return;

      if (!hasRegistrationCall(callback.body)) return;
      if (hasCleanupReturn(callback.body)) return;

      const index = node.range ? node.range[0] : 0;
      findings.push(
        buildFinding(original, index, {
          ruleId: "missing-effect-cleanup",
          confidence: "high",
          title: "Effect registers side effects without cleanup",
          pattern:
            "Listener, timer or subscription registered inside useEffect with no cleanup return.",
          whyItMatters:
            "Without cleanup, listeners and timers survive component unmount and cause memory leaks or stale updates.",
          suggestion:
            "Return a cleanup function from useEffect that removes every registration made inside it.",
          exampleFix:
            'useEffect(() => {\n  window.addEventListener("resize", onResize);\n  return () => window.removeEventListener("resize", onResize);\n}, [onResize]);',
        }),
      );
    });

    return findings;
  },
};
