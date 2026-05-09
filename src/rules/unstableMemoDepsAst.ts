import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { buildFinding } from "./ruleHelpers.js";
import type { Rule, RuleResult } from "./types.js";

type DependencyElement = TSESTree.ArrayExpression["elements"][number];
type NonNullDependencyElement = Exclude<DependencyElement, null>;

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

function isMemoHook(node: TSESTree.CallExpression): boolean {
  const name =
    node.callee.type === "Identifier"
      ? node.callee.name
      : node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier"
        ? node.callee.property.name
        : null;
  return name === "useMemo" || name === "useCallback";
}

function isUnstableDep(node: NonNullDependencyElement): boolean {
  return (
    node.type === "ObjectExpression" ||
    node.type === "ArrayExpression" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression" ||
    node.type === "NewExpression" ||
    node.type === "CallExpression"
  );
}

export const unstableMemoDepsAstRule: Rule = {
  id: "unstable-memo-deps",
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
      if (!isMemoHook(node)) return;

      const depsArg = node.arguments[1];
      if (!depsArg || depsArg.type !== "ArrayExpression") return;

      const unstableDeps = depsArg.elements.filter(
        (element): element is NonNullDependencyElement =>
          element !== null && isUnstableDep(element),
      );

      if (unstableDeps.length === 0) return;

      const index = node.range ? node.range[0] : 0;
      const hookName =
        node.callee.type === "Identifier"
          ? node.callee.name
          : node.callee.type === "MemberExpression" &&
            node.callee.property.type === "Identifier"
            ? node.callee.property.name
            : "useMemo";

      const depDescriptions = unstableDeps
        .map((d) => {
          if (d.type === "ObjectExpression") return "inline object `{}`";
          if (d.type === "ArrayExpression") return "inline array `[]`";
          if (
            d.type === "ArrowFunctionExpression" ||
            d.type === "FunctionExpression"
          )
            return "inline function";
          if (d.type === "NewExpression") return "new expression";
          if (d.type === "CallExpression") return "function call result";
          return "unstable value";
        })
        .join(", ");

      findings.push(
        buildFinding(original, index, {
          ruleId: "unstable-memo-deps",
          confidence: "high",
          title: `${hookName} has unstable dependencies`,
          pattern: `Dependency array contains: ${depDescriptions}.`,
          whyItMatters:
            "Inline values create new references every render, invalidating memoization on every cycle.",
          suggestion:
            "Extract unstable dependencies into their own useMemo/useCallback, or hoist them outside the component.",
          exampleFix:
            "const options = useMemo(() => ({ mode }), [mode]);\nconst value = useMemo(() => compute(options), [options]);",
        }),
      );
    });

    return findings;
  },
};
