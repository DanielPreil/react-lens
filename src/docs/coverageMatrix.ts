import type { ReactLensConfig } from "../config/defaultConfig.js";

export type CoverageStatus = "covered" | "partial" | "missing";

export type CoverageRow = {
  category: string;
  status: CoverageStatus;
  priority: "P0" | "P1" | "P2";
  notes: string;
};

export function buildDocsCoverageMatrix(config: ReactLensConfig): CoverageRow[] {
  const hasOfficialHooks = config.officialHooksLint === "recommended";
  const hasSecurityPack =
    config.rules["dangerous-html-xss-risk"] !== "off" ||
    config.rules["client-env-secrets-risk"] !== "off";

  return [
    {
      category: "Hooks & Rules",
      status: hasOfficialHooks ? "covered" : "partial",
      priority: "P0",
      notes: hasOfficialHooks
        ? "Official react-hooks recommended lint is active."
        : "Official react-hooks baseline is disabled."
    },
    {
      category: "Effects & Memoization",
      status: "covered",
      priority: "P0",
      notes: "Derived state, async races, cleanup, unstable memo/context checks are included."
    },
    {
      category: "RSC Directives & Boundaries",
      status: "partial",
      priority: "P1",
      notes: "Boundary checks are framework-agnostic and rely on static RSC signals."
    },
    {
      category: "Server Function Security",
      status: "partial",
      priority: "P1",
      notes: "Validation/auth checks use static signal detection and may miss wrapper-level safeguards."
    },
    {
      category: "Client / Server Root APIs",
      status: "partial",
      priority: "P1",
      notes: "Hydration and identifierPrefix mismatch risks are covered with static pattern detection."
    },
    {
      category: "Static APIs",
      status: "partial",
      priority: "P2",
      notes: "Static prerender APIs are only covered via hydration mismatch heuristics."
    },
    {
      category: "Security Sinks & Input Safety",
      status: hasSecurityPack ? "covered" : "missing",
      priority: "P0",
      notes: hasSecurityPack
        ? "Includes dangerous HTML and client secret env exposure checks; server-function input safety is tracked separately."
        : "Security-focused checks are disabled."
    },
    {
      category: "Compiler & Directives",
      status: hasOfficialHooks ? "partial" : "missing",
      priority: "P1",
      notes: hasOfficialHooks
        ? "Compiler-oriented lint rules are included through react-hooks plugin; advanced gating checks remain partial."
        : "Compiler and directive checks are limited without official lint baseline."
    }
  ];
}

export function buildCoverageBacklog(matrix: CoverageRow[]): CoverageRow[] {
  const rank: Record<CoverageStatus, number> = { missing: 3, partial: 2, covered: 1 };
  const priorityRank: Record<CoverageRow["priority"], number> = { P0: 3, P1: 2, P2: 1 };

  return [...matrix]
    .filter((row) => row.status !== "covered")
    .sort((a, b) => {
      const statusDelta = rank[b.status] - rank[a.status];
      if (statusDelta !== 0) return statusDelta;
      return priorityRank[b.priority] - priorityRank[a.priority];
    });
}
