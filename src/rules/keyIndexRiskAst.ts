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

function isArrayIndexParam(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): string | null {
  const params = node.params;
  if (params.length >= 2 && params[1].type === "Identifier")
    return params[1].name;
  return null;
}

function isKeyPropWithIndex(
  attr: TSESTree.JSXAttribute,
  indexParamName: string,
): boolean {
  if (attr.name.type !== "JSXIdentifier" || attr.name.name !== "key")
    return false;
  if (!attr.value || attr.value.type !== "JSXExpressionContainer") return false;
  const expr = attr.value.expression;
  if (expr.type === "JSXEmptyExpression") return false;
  if (expr.type === "Identifier" && expr.name === indexParamName) return true;
  if (
    expr.type === "BinaryExpression" &&
    ((expr.left.type === "Identifier" && expr.left.name === indexParamName) ||
      (expr.right.type === "Identifier" && expr.right.name === indexParamName))
  )
    return true;
  if (
    expr.type === "TemplateLiteral" &&
    expr.expressions.some(
      (e) => e.type === "Identifier" && e.name === indexParamName,
    )
  )
    return true;
  return false;
}

export const keyIndexRiskAstRule: Rule = {
  id: "key-index-risk",
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

      const callee = node.callee;
      if (
        callee.type !== "MemberExpression" ||
        callee.property.type !== "Identifier" ||
        callee.property.name !== "map"
      )
        return;

      const mapCallback = node.arguments[0];
      if (
        !mapCallback ||
        (mapCallback.type !== "ArrowFunctionExpression" &&
          mapCallback.type !== "FunctionExpression")
      )
        return;

      const indexParamName = isArrayIndexParam(mapCallback);
      if (!indexParamName) return;

      traverse(mapCallback.body, (inner) => {
        if (inner.type !== "JSXOpeningElement") return;
        for (const attr of inner.attributes) {
          if (attr.type !== "JSXAttribute") continue;
          if (!isKeyPropWithIndex(attr, indexParamName)) continue;

          const index = attr.range ? attr.range[0] : 0;
          findings.push(
            buildFinding(original, index, {
              ruleId: "key-index-risk" as never,
              confidence: "high",
              title: "Array index used as React key",
              pattern: `key={${indexParamName}} uses the map index as the React key.`,
              whyItMatters:
                "Index keys cause incorrect reconciliation when items are reordered, inserted, or removed — leading to subtle UI bugs and broken component state.",
              suggestion:
                "Use a stable, unique identifier from the data as the key instead.",
              exampleFix: `// Instead of key={${indexParamName}}\nkey={item.id}`,
            }),
          );
        }
      });
    });

    return findings;
  },
};
