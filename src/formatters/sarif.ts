import type { Finding } from "../types/findings.js";

function toSarifLevel(severity: Finding["severity"]): "error" | "warning" | "note" {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "note";
}

export function formatSarif(findings: Finding[]): string {
  const ruleMap = new Map<string, Finding>();
  for (const finding of findings) {
    if (!ruleMap.has(finding.ruleId)) {
      ruleMap.set(finding.ruleId, finding);
    }
  }

  const rules = Array.from(ruleMap.values()).map((finding) => ({
    id: finding.ruleId,
    shortDescription: {
      text: finding.title
    },
    fullDescription: {
      text: finding.whyItMatters
    },
    help: {
      text: `${finding.suggestion}${finding.whenToIgnore ? `\n\nWhen to ignore: ${finding.whenToIgnore}` : ""}`
    },
    properties: {
      tags: ["react", "performance", "architecture"],
      precision: finding.confidence
    }
  }));

  const results = findings.map((finding) => ({
    ruleId: finding.ruleId,
    level: toSarifLevel(finding.severity),
    message: {
      text: `${finding.title}. ${finding.suggestion}`
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: finding.filePath
          },
          region: {
            startLine: finding.line,
            startColumn: finding.column
          }
        }
      }
    ],
    properties: {
      severity: finding.severity,
      confidence: finding.confidence,
      pattern: finding.pattern,
      recommendation: finding.suggestion,
      source: finding.source ?? "react-lens",
      fingerprint: finding.fingerprint
    }
  }));

  const report = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "react-lens",
            rules
          }
        },
        results
      }
    ]
  };

  return JSON.stringify(report, null, 2);
}
