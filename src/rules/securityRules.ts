import { parse, type TSESTree } from "@typescript-eslint/typescript-estree";
import { allMatches, buildFinding } from "./ruleHelpers.js";
import type { Rule } from "./types.js";

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

function hasUseClientDirective(ast: TSESTree.Program): boolean {
  for (const statement of ast.body) {
    if (statement.type !== "ExpressionStatement") break;
    if (statement.expression.type !== "Literal") break;
    if (statement.expression.value === "use client") return true;
    if (typeof statement.expression.value !== "string") break;
  }
  return false;
}

function likelyClientModule(filePath: string): boolean {
  if (/\.client\.(t|j)sx?$/.test(filePath)) return true;
  return false;
}

const SANITIZE_HINT_RE = /\b(DOMPurify|sanitize|sanitise|xss|trustedTypes|escapeHtml|safeHtml)\b/i;

function identifierLooksSanitized(source: string, identifier: string): boolean {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declRe = new RegExp(`(?:const|let|var)\\s+${escaped}\\s*=\\s*[\\s\\S]{0,120}?\\b(sanitize|sanitise|escapeHtml|safeHtml)\\b`);
  return declRe.test(source);
}

export const dangerousHtmlXssRiskRule: Rule = {
  id: "dangerous-html-xss-risk",
  run: ({ source, rawSource }) => {
    const original = rawSource ?? source;
    const findings = [];
    const pattern = /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*([^}]+)\}\s*\}/g;

    for (const match of allMatches(pattern, original)) {
      const expression = (match[1] ?? "").trim();
      if (!expression) continue;
      if (SANITIZE_HINT_RE.test(expression)) continue;
      if (/^[A-Za-z_$][\w$]*$/.test(expression) && identifierLooksSanitized(original, expression)) continue;
      if (/^["'`][\s\S]*["'`]$/.test(expression) && !/\$\{/.test(expression)) continue;

      findings.push(
        buildFinding(original, match.index, {
          ruleId: "dangerous-html-xss-risk",
          confidence: "high",
          title: "Potential XSS risk via dangerouslySetInnerHTML",
          pattern: "dangerouslySetInnerHTML receives dynamic content without clear sanitization signal.",
          whyItMatters: "Unsanitized HTML can execute scripts in the browser context.",
          suggestion: "Sanitize HTML (for example with DOMPurify) before assigning __html, or render structured JSX instead."
        })
      );
    }

    return findings;
  }
};

const SAFE_CLIENT_ENV_NAMES = new Set(["NODE_ENV", "PUBLIC_URL"]);

export const clientEnvSecretsRiskRule: Rule = {
  id: "client-env-secrets-risk",
  run: ({ filePath, source, rawSource }) => {
    const original = rawSource ?? source;
    const ast = parseAst(original);
    if (!ast) return [];
    if (!likelyClientModule(filePath) && !hasUseClientDirective(ast)) return [];

    const findings = [];
    const envRe = /process\.env\.([A-Z0-9_]+)/g;
    for (const match of allMatches(envRe, original)) {
      const variableName = match[1] ?? "";
      if (!variableName) continue;
      if (SAFE_CLIENT_ENV_NAMES.has(variableName)) continue;
      if (variableName.startsWith("NEXT_PUBLIC_")) continue;
      if (variableName.startsWith("VITE_")) continue;

      findings.push(
        buildFinding(original, match.index, {
          ruleId: "client-env-secrets-risk",
          confidence: "high",
          title: "Potential secret environment variable usage in client module",
          pattern: `process.env.${variableName} appears in code that is likely shipped to the client.`,
          whyItMatters: "Non-public environment variables may leak sensitive values into browser bundles.",
          suggestion: "Keep secret env access on the server, and expose only explicitly public variables to client code."
        })
      );
    }

    return findings;
  }
};
