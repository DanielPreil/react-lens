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

function isUseMemo(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === "Identifier") return node.callee.name === "useMemo";
  if (node.callee.type === "MemberExpression" && !node.callee.computed) {
    return (
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "useMemo"
    );
  }
  return false;
}

function isComplexExpression(node: TSESTree.Node): boolean {
  if (node.type === "CallExpression") {
    const callee = node.callee;
    if (
      callee.type === "MemberExpression" &&
      callee.property.type === "Identifier"
    ) {
      const name = callee.property.name;
      if (
        [
          "filter",
          "map",
          "reduce",
          "sort",
          "find",
          "flatMap",
          "forEach",
          "some",
          "every",
        ].includes(name)
      )
        return true;
    }
    return true;
  }
  if (node.type === "ConditionalExpression") return true;
  if (node.type === "LogicalExpression") return true;
  if (node.type === "BinaryExpression") {
    if (["+", "-", "*", "/", "%"].includes(node.operator)) return true;
  }
  if (node.type === "NewExpression") return true;
  if (node.type === "AwaitExpression") return true;
  return false;
}

function getCallbackBody(
  callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): TSESTree.Expression | null {
  if (callback.body.type !== "BlockStatement") return callback.body;
  const stmts = callback.body.body;
  if (
    stmts.length === 1 &&
    stmts[0].type === "ReturnStatement" &&
    stmts[0].argument
  ) {
    return stmts[0].argument;
  }
  return null;
}

export const uselessMemoAstRule: Rule = {
  id: "useless-memo",
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
      if (!isUseMemo(node)) return;

      const callback = node.arguments[0];
      if (
        !callback ||
        (callback.type !== "ArrowFunctionExpression" &&
          callback.type !== "FunctionExpression")
      )
        return;

      const body = getCallbackBody(callback);
      if (!body) return;
      if (isComplexExpression(body)) return;

      if (
        body.type !== "Identifier" &&
        body.type !== "Literal" &&
        body.type !== "TemplateLiteral" &&
        body.type !== "MemberExpression"
      )
        return;

      const index = node.range ? node.range[0] : 0;
      const bodySource = body.range
        ? original.slice(body.range[0], body.range[1])
        : "value";

      findings.push(
        buildFinding(original, index, {
          ruleId: "useless-memo",
          confidence: "medium",
          title: "Trivial value wrapped in useMemo",
          pattern: `useMemo returns a simple expression: \`${bodySource.slice(0, 60)}\`.`,
          whyItMatters:
            "Memoizing trivial values adds overhead and noise without measurable performance benefit.",
          suggestion:
            "Remove useMemo and compute the value directly in render.",
          whenToIgnore:
            "Keep it if a stable reference is required by a memoized child component.",
          exampleFix: `const value = ${bodySource};`,
        }),
      );
    });

    return findings;
  },
};
