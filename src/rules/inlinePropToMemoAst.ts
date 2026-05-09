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

function collectMemoizedComponentNames(ast: TSESTree.Program): Set<string> {
  const names = new Set<string>();
  traverse(ast, (node) => {
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier") {
      if (!node.init) return;
      const init = node.init;
      if (
        init.type === "CallExpression" &&
        ((init.callee.type === "Identifier" && init.callee.name === "memo") ||
          (init.callee.type === "MemberExpression" &&
            init.callee.property.type === "Identifier" &&
            init.callee.property.name === "memo"))
      ) {
        names.add(node.id.name);
      }
    }
  });
  return names;
}

function isInlineUnstableValue(node: TSESTree.Node): boolean {
  return (
    node.type === "ObjectExpression" ||
    node.type === "ArrayExpression" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  );
}

export const inlinePropToMemoAstRule: Rule = {
  id: "inline-prop-to-memo",
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

    const memoNames = collectMemoizedComponentNames(ast);
    if (memoNames.size === 0) return [];

    const findings: RuleResult[] = [];

    traverse(ast, (node) => {
      if (node.type !== "JSXOpeningElement") return;
      const nameNode = node.name;
      if (nameNode.type !== "JSXIdentifier") return;
      if (!memoNames.has(nameNode.name)) return;

      for (const attr of node.attributes) {
        if (attr.type !== "JSXAttribute") continue;
        if (!attr.value) continue;
        if (attr.value.type !== "JSXExpressionContainer") continue;
        const expr = attr.value.expression;
        if (expr.type === "JSXEmptyExpression") continue;
        if (!isInlineUnstableValue(expr)) continue;

        const index = attr.range ? attr.range[0] : 0;
        const propName =
          attr.name.type === "JSXIdentifier" ? attr.name.name : "prop";
        findings.push(
          buildFinding(original, index, {
            ruleId: "inline-prop-to-memo",
            confidence: "medium",
            title: "Inline prop passed to memoized component",
            pattern: `Prop \`${propName}\` is an inline ${expr.type === "ObjectExpression" ? "object" : expr.type === "ArrayExpression" ? "array" : "function"} on a React.memo component.`,
            whyItMatters:
              "A new reference is created every render, which prevents React.memo from skipping re-renders.",
            suggestion: `Hoist \`${propName}\` outside the component or stabilize it with useMemo/useCallback.`,
            exampleFix: `const ${propName} = useMemo(() => ({ /* value */ }), [/* deps */]);`,
          }),
        );
      }
    });

    return findings;
  },
};
