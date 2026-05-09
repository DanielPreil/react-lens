import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { buildFinding } from "./ruleHelpers.js";
import type { Rule, RuleResult } from "./types.js";

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

type ServerFunction = {
  node: FunctionNode;
  name: string;
};

function traverse(node: unknown, visit: (node: TSESTree.Node, ancestors: TSESTree.Node[]) => void, ancestors: TSESTree.Node[] = []): void {
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

function parseAst(source: string): TSESTree.Program | null {
  try {
    return parse(source, {
      jsx: true,
      range: true,
      loc: true,
      sourceType: "module"
    });
  } catch {
    return null;
  }
}

function isDirectiveStatement(
  statement: TSESTree.Statement,
  directive: "use client" | "use server"
): boolean {
  if (statement.type !== "ExpressionStatement") return false;
  if (statement.expression.type !== "Literal") return false;
  return statement.expression.value === directive;
}

function hasModuleDirective(ast: TSESTree.Program, directive: "use client" | "use server"): boolean {
  for (const statement of ast.body) {
    if (isDirectiveStatement(statement, directive)) return true;

    if (
      statement.type !== "ExpressionStatement" ||
      statement.expression.type !== "Literal" ||
      typeof statement.expression.value !== "string"
    ) {
      break;
    }
  }
  return false;
}

function getFunctionBodyStatements(fn: FunctionNode): TSESTree.Statement[] {
  if (fn.body.type !== "BlockStatement") return [];
  return fn.body.body;
}

function hasFunctionDirective(fn: FunctionNode, directive: "use server"): boolean {
  const body = getFunctionBodyStatements(fn);
  if (body.length === 0) return false;
  return isDirectiveStatement(body[0], directive);
}

function hasMisplacedFunctionDirective(fn: FunctionNode, directive: "use server"): boolean {
  const body = getFunctionBodyStatements(fn);
  for (let i = 0; i < body.length; i += 1) {
    if (isDirectiveStatement(body[i], directive)) {
      return i !== 0;
    }
  }
  return false;
}

function isRscCandidate(
  filePath: string,
  source: string,
  mode: "auto" | "client" | "rsc"
): boolean {
  if (mode === "client") return false;
  if (mode === "rsc") return true;
  if (/["']use server["']/.test(source)) return true;
  if (/[\\/]rsc[\\/]/i.test(filePath)) return true;
  if (/\.server\.(t|j)sx?$/.test(filePath)) return true;
  return false;
}

const CLIENT_ONLY_HOOK_RE =
  /\b(useState|useEffect|useLayoutEffect|useInsertionEffect|useReducer|useRef|useTransition|useOptimistic|useActionState|useImperativeHandle)\s*\(/g;

export const rscClientBoundaryRule: Rule = {
  id: "rsc-client-boundary",
  run: ({ filePath, source, rawSource, reactEnvironment }) => {
    const original = rawSource ?? source;
    const ast = parseAst(original);
    if (!ast) return [];
    if (hasModuleDirective(ast, "use client")) return [];
    if (!isRscCandidate(filePath, original, reactEnvironment)) return [];

    const match = CLIENT_ONLY_HOOK_RE.exec(original);
    if (!match) return [];

    return [
      buildFinding(original, match.index, {
        ruleId: "rsc-client-boundary",
        confidence: "high",
        title: "Server component boundary may use client-only hook",
        pattern: `Detected client-only hook usage (${match[1]}) in a likely server-evaluated module.`,
        whyItMatters: "Server Components cannot use interactive client hooks.",
        suggestion: "Move interactive logic into a 'use client' component and pass serializable data via props.",
        whenToIgnore: "Ignore when this module is guaranteed to run only on the client in your framework."
      })
    ];
  }
};

function getNamedFunction(node: TSESTree.Node): { fn: FunctionNode; name: string } | null {
  if (node.type === "FunctionDeclaration") {
    return { fn: node, name: node.id?.name ?? "anonymous" };
  }
  if (node.type === "VariableDeclarator") {
    if (node.id.type !== "Identifier") return null;
    if (!node.init) return null;
    if (node.init.type !== "FunctionExpression" && node.init.type !== "ArrowFunctionExpression") return null;
    return { fn: node.init, name: node.id.name };
  }
  return null;
}

function collectExportedFunctions(ast: TSESTree.Program): ServerFunction[] {
  const out: ServerFunction[] = [];

  for (const statement of ast.body) {
    if (statement.type === "ExportNamedDeclaration" && statement.declaration) {
      const named = getNamedFunction(statement.declaration);
      if (named) out.push({ node: named.fn, name: named.name });
    }

    if (statement.type === "ExportDefaultDeclaration") {
      const decl = statement.declaration;
      if (decl.type === "FunctionDeclaration") {
        out.push({ node: decl, name: decl.id?.name ?? "default" });
      } else if (decl.type === "ArrowFunctionExpression" || decl.type === "FunctionExpression") {
        out.push({ node: decl, name: "default" });
      }
    }
  }

  return out;
}

function isAsyncFunction(fn: FunctionNode): boolean {
  return Boolean(fn.async);
}

function functionStartIndex(fn: FunctionNode): number {
  return fn.range?.[0] ?? 0;
}

function collectInlineServerFunctions(ast: TSESTree.Program): ServerFunction[] {
  const out: ServerFunction[] = [];

  traverse(ast, (node, ancestors) => {
    if (
      node.type !== "FunctionDeclaration" &&
      node.type !== "FunctionExpression" &&
      node.type !== "ArrowFunctionExpression"
    ) {
      return;
    }

    if (!hasFunctionDirective(node, "use server")) return;

    let name = "anonymous";
    const parent = ancestors[ancestors.length - 1];
    if (node.type === "FunctionDeclaration" && node.id?.name) {
      name = node.id.name;
    } else if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
      name = parent.id.name;
    }

    out.push({ node, name });
  });

  return out;
}

export const serverFunctionContractRule: Rule = {
  id: "server-function-contract",
  run: ({ source, rawSource }) => {
    const original = rawSource ?? source;
    const ast = parseAst(original);
    if (!ast) return [];

    const findings: RuleResult[] = [];
    const moduleServer = hasModuleDirective(ast, "use server");
    const moduleClient = hasModuleDirective(ast, "use client");

    if (moduleServer && moduleClient) {
      findings.push(
        buildFinding(original, 0, {
          ruleId: "server-function-contract",
          confidence: "high",
          title: "Conflicting RSC directives in module",
          pattern: "Both 'use client' and 'use server' directives appear in the same module.",
          whyItMatters: "Client and server execution boundaries must remain explicit and non-conflicting.",
          suggestion: "Split client and server logic into separate files and keep only one directive per module."
        })
      );
    }

    if (moduleServer) {
      const exportedFns = collectExportedFunctions(ast);
      for (const item of exportedFns) {
        if (!isAsyncFunction(item.node)) {
          findings.push(
            buildFinding(original, functionStartIndex(item.node), {
              ruleId: "server-function-contract",
              confidence: "high",
              title: "Server Function export should be async",
              pattern: `Export '${item.name}' is in a 'use server' module but is not async.`,
              whyItMatters: "Server Function calls are asynchronous network operations.",
              suggestion: "Mark exported server-callable functions as async."
            })
          );
        }
      }
    }

    const inlineServerFns = collectInlineServerFunctions(ast);
    for (const item of inlineServerFns) {
      if (!isAsyncFunction(item.node)) {
        findings.push(
          buildFinding(original, functionStartIndex(item.node), {
            ruleId: "server-function-contract",
            confidence: "high",
            title: "Inline 'use server' function must be async",
            pattern: `Function '${item.name}' contains 'use server' but is not async.`,
            whyItMatters: "Server Function invocations from clients are always asynchronous.",
            suggestion: "Convert this function to async and await side effects as needed."
          })
        );
      }
    }

    traverse(ast, (node) => {
      if (
        node.type !== "FunctionDeclaration" &&
        node.type !== "FunctionExpression" &&
        node.type !== "ArrowFunctionExpression"
      ) {
        return;
      }

      if (!hasMisplacedFunctionDirective(node, "use server")) return;
      findings.push(
        buildFinding(original, functionStartIndex(node), {
          ruleId: "server-function-contract",
          confidence: "medium",
          title: "'use server' directive should be first in function body",
          pattern: "Directive appears after other statements.",
          whyItMatters: "RSC directives are only recognized when placed at the top of a module or function.",
          suggestion: "Move 'use server' to the first statement in the function body."
        })
      );
    });

    return findings;
  }
};

function collectServerFunctions(ast: TSESTree.Program): ServerFunction[] {
  const moduleServer = hasModuleDirective(ast, "use server");
  const out = new Map<string, ServerFunction>();

  const maybeAdd = (item: ServerFunction): void => {
    const key = `${item.name}:${item.node.range?.[0] ?? 0}`;
    if (!out.has(key)) out.set(key, item);
  };

  if (moduleServer) {
    for (const item of collectExportedFunctions(ast)) maybeAdd(item);
  }
  for (const item of collectInlineServerFunctions(ast)) maybeAdd(item);

  return Array.from(out.values());
}

function hasValidationSignals(text: string): boolean {
  return /\b(zod|schema|validate|validator|parse|assert|sanitize|escape|authorize|auth|permission|session|csrf)\b/i.test(text);
}

function hasMutationSignals(text: string): boolean {
  return /\b(insert|update|delete|create|save|upsert|write|mutate)\b|db\.|prisma\.|sql`|collection\./i.test(text);
}

function hasParams(fn: FunctionNode): boolean {
  return fn.params.length > 0;
}

export const serverFunctionUntrustedInputRule: Rule = {
  id: "server-function-untrusted-input",
  run: ({ source, rawSource }) => {
    const original = rawSource ?? source;
    const ast = parseAst(original);
    if (!ast) return [];

    const findings: RuleResult[] = [];
    const functions = collectServerFunctions(ast);

    for (const item of functions) {
      if (!hasParams(item.node) || !item.node.range) continue;
      const functionText = original.slice(item.node.range[0], item.node.range[1]);
      const hasValidation = hasValidationSignals(functionText);
      const mutates = hasMutationSignals(functionText);
      if (!mutates || hasValidation) continue;

      findings.push(
        buildFinding(original, item.node.range[0], {
          ruleId: "server-function-untrusted-input",
          confidence: "medium",
          title: "Server Function may mutate with unvalidated input",
          pattern: `Function '${item.name}' appears to mutate state without clear validation/authorization checks.`,
          whyItMatters: "Server Function arguments are client-controlled and must be treated as untrusted input.",
          suggestion: "Validate inputs (e.g. schema parse), enforce authz checks, and sanitize/escape before mutating.",
          whenToIgnore: "Ignore when validation/authorization is guaranteed in wrappers not visible in this module."
        })
      );
    }

    return findings;
  }
};

export const serializablePropsAcrossBoundaryRule: Rule = {
  id: "serializable-props-across-boundary",
  run: ({ filePath, source, rawSource, reactEnvironment }) => {
    const original = rawSource ?? source;
    const ast = parseAst(original);
    if (!ast) return [];
    if (hasModuleDirective(ast, "use client")) return [];
    if (!isRscCandidate(filePath, original, reactEnvironment)) return [];

    const inlineFnPropMatch = /<[A-Z]\w*[^>]*\s[a-zA-Z_$][\w$]*=\{\s*(?:\([^)]*\)\s*=>|function\s*\()/g.exec(original);
    if (!inlineFnPropMatch) return [];

    return [
      buildFinding(original, inlineFnPropMatch.index, {
        ruleId: "serializable-props-across-boundary",
        confidence: "medium",
        title: "Potential non-serializable prop crossing server/client boundary",
        pattern: "Inline function prop passed through JSX in a likely server-evaluated module.",
        whyItMatters: "Props passed from Server Components to Client Components should be serializable (or server references).",
        suggestion: "Pass serializable data props, or convert the callback into a Server Function reference."
      })
    ];
  }
};

function getIdentifierPrefixArg(source: string, callName: "hydrateRoot" | "renderToPipeableStream" | "renderToReadableStream" | "prerender"): string | null {
  const re = new RegExp(`${callName}\\s*\\([\\s\\S]{0,300}?identifierPrefix\\s*:\\s*["']([^"']+)["']`, "m");
  const match = re.exec(source);
  return match?.[1] ?? null;
}

export const hydrationRootMismatchRiskRule: Rule = {
  id: "hydration-root-mismatch-risk",
  run: ({ source, rawSource }) => {
    const original = rawSource ?? source;
    const findings: RuleResult[] = [];

    const createRootMatch = /\bcreateRoot\s*\(/.exec(original);
    const hydrateRootMatch = /\bhydrateRoot\s*\(/.exec(original);
    const serverRenderMatch = /\b(renderToPipeableStream|renderToReadableStream|prerender)\s*\(/.exec(original);

    if (serverRenderMatch && createRootMatch && !hydrateRootMatch) {
      findings.push(
        buildFinding(original, createRootMatch.index, {
          ruleId: "hydration-root-mismatch-risk",
          confidence: "high",
          title: "createRoot used in SSR hydration context",
          pattern: "Server render APIs appear together with createRoot without hydrateRoot.",
          whyItMatters: "SSR markup should be attached with hydrateRoot to avoid hydration mismatches.",
          suggestion: "Use hydrateRoot for server-rendered HTML containers."
        })
      );
    }

    if (hydrateRootMatch && serverRenderMatch) {
      const clientPrefix = getIdentifierPrefixArg(original, "hydrateRoot");
      const serverPrefix =
        getIdentifierPrefixArg(original, "renderToPipeableStream") ??
        getIdentifierPrefixArg(original, "renderToReadableStream") ??
        getIdentifierPrefixArg(original, "prerender");

      if (clientPrefix && serverPrefix && clientPrefix !== serverPrefix) {
        findings.push(
          buildFinding(original, hydrateRootMatch.index, {
            ruleId: "hydration-root-mismatch-risk",
            confidence: "high",
            title: "hydrateRoot identifierPrefix differs from server render prefix",
            pattern: `Client prefix '${clientPrefix}' does not match server prefix '${serverPrefix}'.`,
            whyItMatters: "useId-generated IDs can mismatch between server and client when prefixes differ.",
            suggestion: "Use the same identifierPrefix on both server render and hydrateRoot."
          })
        );
      }
    }

    return findings;
  }
};
