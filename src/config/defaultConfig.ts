import type { RuleConfig } from "../types/findings.js";

export type ReactLensConfig = {
  include: string[];
  ignore: string[];
  reactCompiler: "auto" | "on" | "off";
  officialHooksLint: "off" | "recommended";
  rolloutMode: "gradual" | "strict" | "report-only";
  reactEnvironment: "auto" | "client" | "rsc";
  rules: RuleConfig;
};

export const defaultConfig: ReactLensConfig = {
  include: ["src/**/*.{ts,tsx,js,jsx}"],
  ignore: ["dist/**", "node_modules/**"],
  reactCompiler: "auto",
  officialHooksLint: "recommended",
  rolloutMode: "gradual",
  reactEnvironment: "auto",
  rules: {
    "effect-derived-state": "warning",
    "effect-event-flag": "warning",
    "async-effect-race": "warning",
    "missing-effect-cleanup": "error",
    "unstable-context-value": "warning",
    "inline-prop-to-memo": "warning",
    "useless-memo": "info",
    "unstable-memo-deps": "warning",
    "rsc-client-boundary": "warning",
    "key-index-risk": "warning",
    "server-function-contract": "error",
    "server-function-untrusted-input": "warning",
    "serializable-props-across-boundary": "warning",
    "hydration-root-mismatch-risk": "warning",
    "dangerous-html-xss-risk": "error",
    "client-env-secrets-risk": "error",
  },
};
