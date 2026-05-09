import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { buildFinding } from "./ruleHelpers.js";
import type { Rule, RuleResult } from "./types.js";

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;

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

function isHookCall(node: TSESTree.CallExpression, hookName: "useState" | "useEffect"): boolean {
  if (node.callee.type === "Identifier") return node.callee.name === hookName;
  if (node.callee.type === "MemberExpression" && !node.callee.computed) {
    return node.callee.property.type === "Identifier" && node.callee.property.name === hookName;
  }
  return false;
}

function isPromiseChainCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type !== "MemberExpression" || node.callee.computed) return false;
  if (node.callee.property.type !== "Identifier") return false;
  return node.callee.property.name === "then" || node.callee.property.name === "catch" || node.callee.property.name === "finally";
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

function getCleanupFunction(callback: FunctionNode): FunctionNode | null {
  if (callback.body.type !== "BlockStatement") return null;

  for (const statement of callback.body.body) {
    if (statement.type !== "ReturnStatement") continue;
    const arg = statement.argument;
    if (!arg) continue;
    if (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") {
      return arg;
    }
  }

  return null;
}

function collectAbortControllers(callback: FunctionNode): Set<string> {
  const controllers = new Set<string>();
  if (callback.body.type !== "BlockStatement") return controllers;

  traverse(callback.body, (node) => {
    if (node.type !== "VariableDeclarator") return;
    if (node.id.type !== "Identifier") return;
    if (!node.init || node.init.type !== "NewExpression") return;
    if (node.init.callee.type !== "Identifier") return;
    if (node.init.callee.name === "AbortController") {
      controllers.add(node.id.name);
    }
  });

  return controllers;
}

function hasAbortCleanup(cleanup: FunctionNode | null, controllers: Set<string>): boolean {
  if (!cleanup || controllers.size === 0) return false;

  let found = false;
  traverse(cleanup.body, (node) => {
    if (found) return;
    if (node.type !== "CallExpression") return;
    if (node.callee.type !== "MemberExpression" || node.callee.computed) return;
    if (node.callee.object.type !== "Identifier") return;
    if (!controllers.has(node.callee.object.name)) return;
    if (node.callee.property.type === "Identifier" && node.callee.property.name === "abort") {
      found = true;
    }
  });

  return found;
}

function collectStaleGuardFlags(callback: FunctionNode): Set<string> {
  const flags = new Set<string>();
  if (callback.body.type !== "BlockStatement") return flags;

  traverse(callback.body, (node) => {
    if (node.type !== "VariableDeclarator") return;
    if (node.id.type !== "Identifier") return;
    if (!node.init || node.init.type !== "Literal" || node.init.value !== false) return;
    if (/(ignore|discard|cancel|stale|active|mounted)/i.test(node.id.name)) {
      flags.add(node.id.name);
    }
  });

  return flags;
}

function cleanupSetsFlagTrue(cleanup: FunctionNode | null, flags: Set<string>): boolean {
  if (!cleanup || flags.size === 0) return false;

  let found = false;
  traverse(cleanup.body, (node) => {
    if (found) return;
    if (node.type !== "AssignmentExpression") return;
    if (node.left.type !== "Identifier" || !flags.has(node.left.name)) return;
    if (node.right.type === "Literal" && node.right.value === true) {
      found = true;
    }
  });

  return found;
}

function callbackChecksFlag(callback: FunctionNode, flags: Set<string>): boolean {
  if (flags.size === 0) return false;

  let found = false;
  traverse(callback.body, (node) => {
    if (found) return;
    if (node.type !== "Identifier") return;
    if (!flags.has(node.name)) return;
    found = true;
  });

  return found;
}

function hasAsyncActivity(callback: FunctionNode): boolean {
  if (callback.async) return true;

  let found = false;
  traverse(callback.body, (node) => {
    if (found) return;
    if (node.type === "AwaitExpression") {
      found = true;
      return;
    }
    if (node.type !== "CallExpression") return;
    if (node.callee.type === "Identifier" && node.callee.name === "fetch") {
      found = true;
      return;
    }
    if (isPromiseChainCall(node)) {
      found = true;
    }
  });

  return found;
}

function isInsidePromiseCallback(ancestors: TSESTree.Node[]): boolean {
  for (let i = 0; i < ancestors.length - 1; i += 1) {
    const maybeFn = ancestors[i];
    const maybeCall = ancestors[i + 1];
    if (
      (maybeFn.type === "ArrowFunctionExpression" || maybeFn.type === "FunctionExpression") &&
      maybeCall.type === "CallExpression" &&
      maybeCall.arguments.includes(maybeFn) &&
      isPromiseChainCall(maybeCall)
    ) {
      return true;
    }
  }
  return false;
}

function collectAsyncSetterCalls(callback: FunctionNode, setters: Set<string>): TSESTree.CallExpression[] {
  const calls: TSESTree.CallExpression[] = [];

  traverse(callback.body, (node, ancestors) => {
    if (node.type === "CallExpression" && isPromiseChainCall(node)) {
      const hasSetterCallback = node.arguments.some(
        (arg) => arg.type === "Identifier" && setters.has(arg.name)
      );
      if (hasSetterCallback) {
        calls.push(node);
        return;
      }
    }

    if (node.type !== "CallExpression") return;
    if (node.callee.type !== "Identifier" || !setters.has(node.callee.name)) return;

    const inAsyncFunction = ancestors.some(
      (ancestor) =>
        (ancestor.type === "ArrowFunctionExpression" ||
          ancestor.type === "FunctionExpression" ||
          ancestor.type === "FunctionDeclaration") &&
        ancestor !== callback &&
        ancestor.async
    );
    const inPromiseCallback = isInsidePromiseCallback(ancestors);
    const afterAwait = ancestors.some((ancestor) => ancestor.type === "AwaitExpression");
    const hasUpdaterArg =
      node.arguments[0]?.type === "ArrowFunctionExpression" || node.arguments[0]?.type === "FunctionExpression";

    if ((inAsyncFunction || inPromiseCallback || afterAwait) && !hasUpdaterArg) {
      calls.push(node);
    }
  });

  return calls;
}

function buildRaceFinding(source: string, node: TSESTree.CallExpression, confidence: "high" | "medium"): RuleResult {
  const index = node.range ? node.range[0] : 0;
  return buildFinding(source, index, {
    ruleId: "async-effect-race",
    confidence,
    title: "Async effect may update stale state",
    pattern: "Async effect updates state but no stale-response guard or cancellation is detected.",
    whyItMatters: "Older async responses can overwrite newer state and cause hard-to-reproduce UI bugs.",
    suggestion: "Use AbortController or an ignore/discard flag in cleanup before committing async results.",
    whenToIgnore: "Ignore when requests are guaranteed to resolve in order and stale updates are impossible.",
    exampleFix:
      "useEffect(() => {\n  const controller = new AbortController();\n  let ignore = false;\n\n  async function load() {\n    const res = await fetch(url, { signal: controller.signal });\n    const data = await res.json();\n    if (!ignore) setData(data);\n  }\n\n  load();\n  return () => {\n    ignore = true;\n    controller.abort();\n  };\n}, [url]);"
  });
}

export const asyncEffectRaceAstRule: Rule = {
  id: "async-effect-race",
  run: ({ source, rawSource }) => {
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

    const setters = collectStateSetters(ast);
    if (setters.size === 0) return [];

    const findings: RuleResult[] = [];

    traverse(ast, (node) => {
      if (node.type !== "CallExpression") return;
      if (!isHookCall(node, "useEffect")) return;
      const deps = node.arguments[1];
      if (!deps || deps.type !== "ArrayExpression" || deps.elements.length === 0) return;

      const callback = node.arguments[0];
      if (!callback) return;
      if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") return;
      if (!hasAsyncActivity(callback)) return;

      const cleanup = getCleanupFunction(callback);
      const controllers = collectAbortControllers(callback);
      const abortGuard = hasAbortCleanup(cleanup, controllers);
      const staleFlags = collectStaleGuardFlags(callback);
      const staleGuard = cleanupSetsFlagTrue(cleanup, staleFlags) && callbackChecksFlag(callback, staleFlags);
      const hasGuard = abortGuard || staleGuard;

      const setterCalls = collectAsyncSetterCalls(callback, setters);
      if (setterCalls.length === 0 || hasGuard) return;

      const confidence: "high" | "medium" = setterCalls.length === 1 ? "high" : "medium";
      findings.push(buildRaceFinding(original, setterCalls[0], confidence));
    });

    return findings;
  }
};
