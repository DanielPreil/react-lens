import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { buildFinding } from "./ruleHelpers.js";
import type { Rule, RuleResult } from "./types.js";

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

function traverse(
  node: unknown,
  visit: (node: TSESTree.Node, ancestors: TSESTree.Node[]) => void,
  ancestors: TSESTree.Node[] = []
): void {
  if (!node || typeof node !== "object") return;
  const maybeNode = node as Partial<TSESTree.Node>;
  if (typeof maybeNode.type !== "string") return;

  const current = maybeNode as TSESTree.Node;
  visit(current, ancestors);
  const nextAncestors = [...ancestors, current];

  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const child of value) {
        traverse(child, visit, nextAncestors);
      }
      continue;
    }
    if (value && typeof value === "object") {
      traverse(value, visit, nextAncestors);
    }
  }
}

function isInlineUnstableExpr(expr: TSESTree.Expression): boolean {
  return (
    expr.type === "ObjectExpression" ||
    expr.type === "ArrayExpression" ||
    expr.type === "ArrowFunctionExpression" ||
    expr.type === "FunctionExpression"
  );
}

function isProviderJsx(node: TSESTree.JSXOpeningElement): boolean {
  if (node.name.type !== "JSXMemberExpression") return false;
  return node.name.property.type === "JSXIdentifier" && node.name.property.name === "Provider";
}

function getEnclosingFunction(ancestors: TSESTree.Node[]): FunctionNode | null {
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const node = ancestors[i];
    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      return node;
    }
  }
  return null;
}

function hasUseMemoDirective(fn: FunctionNode): boolean {
  if (fn.body.type !== "BlockStatement") return false;
  for (const statement of fn.body.body) {
    if (statement.type !== "ExpressionStatement") continue;
    if (statement.expression.type !== "Literal") continue;
    if (statement.expression.value === "use memo") return true;
    break;
  }
  return false;
}

function buildUnstableContextFinding(source: string, node: TSESTree.JSXAttribute): RuleResult {
  const index = node.range ? node.range[0] : 0;
  return buildFinding(source, index, {
    ruleId: "unstable-context-value",
    confidence: "high",
    title: "Context provider may receive unstable value reference",
    pattern: "Inline object/array/function is passed directly to Provider value.",
    whyItMatters: "New references can re-render all context consumers even when semantic data did not change.",
    suggestion: "Memoize provider value or hoist stable data; split context when unrelated values are bundled.",
    whenToIgnore: "Ignore when React Compiler memoization (`\"use memo\"`) is intentionally managing this case.",
    exampleFix:
      "const value = useMemo(() => ({ user, logout }), [user, logout]);\nreturn <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;"
  });
}

export const unstableContextValueAstRule: Rule = {
  id: "unstable-context-value",
  run: ({ source, rawSource, reactCompilerMode }) => {
    const original = rawSource ?? source;
    let ast: TSESTree.Program;

    try {
      ast = parse(original, {
        jsx: true,
        loc: true,
        range: true,
        comment: true,
        sourceType: "module"
      });
    } catch {
      return [];
    }

    const compilerAware = reactCompilerMode !== "off";
    const findings: RuleResult[] = [];

    traverse(ast, (node, ancestors) => {
      if (node.type !== "JSXOpeningElement") return;
      if (!isProviderJsx(node)) return;

      const valueAttr = node.attributes.find(
        (attr): attr is TSESTree.JSXAttribute => attr.type === "JSXAttribute" && attr.name.name === "value"
      );
      if (!valueAttr || !valueAttr.value || valueAttr.value.type !== "JSXExpressionContainer") return;

      const expr = valueAttr.value.expression;
      if (expr.type === "JSXEmptyExpression" || !isInlineUnstableExpr(expr)) return;

      if (compilerAware) {
        const fn = getEnclosingFunction(ancestors);
        if (fn && hasUseMemoDirective(fn)) return;
      }

      findings.push(buildUnstableContextFinding(original, valueAttr));
    });

    return findings;
  }
};
