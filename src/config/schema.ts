import { z } from "zod";

const ruleLevel = z.enum(["off", "error", "warning", "suggestion", "info"]);

export const configSchema = z.object({
  include: z.array(z.string()).default(["src/**/*.{ts,tsx,js,jsx}"]),
  ignore: z.array(z.string()).default(["dist/**", "node_modules/**"]),
  reactCompiler: z.enum(["auto", "on", "off"]).default("auto"),
  officialHooksLint: z.enum(["off", "recommended"]).default("recommended"),
  rolloutMode: z.enum(["gradual", "strict", "report-only"]).default("gradual"),
  reactEnvironment: z.enum(["auto", "client", "rsc"]).default("auto"),
  rules: z
    .object({
      "effect-derived-state": ruleLevel.default("warning"),
      "effect-event-flag": ruleLevel.default("warning"),
      "async-effect-race": ruleLevel.default("warning"),
      "missing-effect-cleanup": ruleLevel.default("error"),
      "unstable-context-value": ruleLevel.default("warning"),
      "inline-prop-to-memo": ruleLevel.default("warning"),
      "useless-memo": ruleLevel.default("info"),
      "unstable-memo-deps": ruleLevel.default("warning"),
      "rsc-client-boundary": ruleLevel.default("warning"),
      "key-index-risk": ruleLevel.default("warning"),
      "server-function-contract": ruleLevel.default("error"),
      "server-function-untrusted-input": ruleLevel.default("warning"),
      "serializable-props-across-boundary": ruleLevel.default("warning"),
      "hydration-root-mismatch-risk": ruleLevel.default("warning"),
      "dangerous-html-xss-risk": ruleLevel.default("error"),
      "client-env-secrets-risk": ruleLevel.default("error"),
    })
    .default({}),
});
