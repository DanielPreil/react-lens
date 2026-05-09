import type { Rule } from "./types.js";
import { allMatches, buildFinding } from "./ruleHelpers.js";
import { effectDerivedStateAstRule } from "./effectDerivedStateAst.js";
import { effectEventFlagAstRule } from "./effectEventFlagAst.js";
import { asyncEffectRaceAstRule } from "./asyncEffectRaceAst.js";
import { missingEffectCleanupAstRule } from "./missingEffectCleanupAst.js";
import { unstableContextValueAstRule } from "./unstableContextValueAst.js";
import { inlinePropToMemoAstRule } from "./inlinePropToMemoAst.js";
import { uselessMemoAstRule } from "./uselessMemoAst.js";
import { unstableMemoDepsAstRule } from "./unstableMemoDepsAst.js";
import { keyIndexRiskAstRule } from "./keyIndexRiskAst.js";
import {
  hydrationRootMismatchRiskRule,
  rscClientBoundaryRule,
  serializablePropsAcrossBoundaryRule,
  serverFunctionContractRule,
  serverFunctionUntrustedInputRule,
} from "./rscSafetyRules.js";
import {
  clientEnvSecretsRiskRule,
  dangerousHtmlXssRiskRule,
} from "./securityRules.js";

export const coreRules: Rule[] = [
  effectDerivedStateAstRule,
  effectEventFlagAstRule,
  asyncEffectRaceAstRule,
  missingEffectCleanupAstRule,
  unstableContextValueAstRule,
  inlinePropToMemoAstRule,
  uselessMemoAstRule,
  unstableMemoDepsAstRule,
  keyIndexRiskAstRule,
  rscClientBoundaryRule,
  serverFunctionContractRule,
  serverFunctionUntrustedInputRule,
  serializablePropsAcrossBoundaryRule,
  hydrationRootMismatchRiskRule,
  dangerousHtmlXssRiskRule,
  clientEnvSecretsRiskRule,
];
