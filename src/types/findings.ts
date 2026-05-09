export type Severity = "error" | "warning" | "suggestion" | "info";
export type Confidence = "high" | "medium" | "low";
export type CoreRuleId =
  | "effect-derived-state"
  | "effect-event-flag"
  | "async-effect-race"
  | "missing-effect-cleanup"
  | "unstable-context-value"
  | "inline-prop-to-memo"
  | "useless-memo"
  | "unstable-memo-deps"
  | "rsc-client-boundary"
  | "server-function-contract"
  | "server-function-untrusted-input"
  | "serializable-props-across-boundary"
  | "hydration-root-mismatch-risk"
  | "dangerous-html-xss-risk"
  | "key-index-risk"
  | "client-env-secrets-risk";
export type RuleId = CoreRuleId | `react-hooks/${string}`;
export type FindingSource = "react-lens" | "react-hooks-eslint";
export type Finding = {
  ruleId: RuleId;
  severity: Severity;
  confidence: Confidence;
  filePath: string;
  line: number;
  column: number;
  title: string;
  pattern: string;
  whyItMatters: string;
  suggestion: string;
  whenToIgnore?: string;
  exampleFix?: string;
  codeSnippet?: string;
  source?: FindingSource;
  fingerprint?: string;
};
export type RuleLevel = Severity | "off";
export type RuleConfig = Record<CoreRuleId, RuleLevel>;
