import type { CoreRuleId, Finding } from "../types/findings.js";

export type RuleContext = {
  filePath: string;
  source: string;
  rawSource?: string;
  reactCompilerMode: "auto" | "on" | "off";
  reactEnvironment: "auto" | "client" | "rsc";
};

export type RuleResult = Omit<Finding, "filePath" | "severity">;

export type Rule = {
  id: CoreRuleId;
  run: (ctx: RuleContext) => RuleResult[];
};
