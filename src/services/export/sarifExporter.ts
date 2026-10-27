/**
 * SARIF 2.1.0 Security Report Exporter
 *
 * Adapted from Strix-main SARIF reporting engine.
 * Generates valid OASIS Static Analysis Results Interchange Format (SARIF) JSON
 * for direct ingestion into GitHub Advanced Security, GitLab SAST, and CI/CD pipelines.
 */

import type { SecurityScanReport, SecurityVulnerability } from '../ai/promptSecurityScanner.ts';

export interface SarifExportOptions {
  promptTitle: string;
  promptSlug?: string;
  report: SecurityScanReport;
  version?: string;
}

export function exportToSarif(options: SarifExportOptions): string {
  const { promptTitle, promptSlug = 'prompt', report, version = '1.0.0' } = options;

  const sarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'PromptHub Security & Red-Teaming Scanner',
            version,
            informationUri: 'https://prompthub.cloud/docs/security',
            rules: report.vulnerabilities.map((v: SecurityVulnerability) => ({
              id: v.id,
              name: v.category,
              shortDescription: {
                text: v.title,
              },
              fullDescription: {
                text: v.description,
              },
              help: {
                text: `Remediation guidance: ${v.recommendation}`,
              },
              defaultConfiguration: {
                level: v.severity === 'critical' || v.severity === 'high' ? 'error' : 'warning',
              },
              properties: {
                tags: ['security', 'ai-safety', 'prompt-injection', v.category],
                precision: 'high',
              },
            })),
          },
        },
        invocations: [
          {
            executionSuccessful: true,
            endTimeUtc: report.scannedAt,
          },
        ],
        artifacts: [
          {
            location: {
              uri: `${promptSlug}.prompt.md`,
            },
            sourceLanguage: 'markdown',
            description: {
              text: promptTitle,
            },
          },
        ],
        results: report.vulnerabilities.map((v: SecurityVulnerability) => ({
          ruleId: v.id,
          level: v.severity === 'critical' || v.severity === 'high' ? 'error' : 'warning',
          message: {
            text: `${v.title}: ${v.description}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: `${promptSlug}.prompt.md`,
                },
                region: {
                  startLine: 1,
                  startColumn: 1,
                  snippet: v.matchedSnippet ? { text: v.matchedSnippet } : undefined,
                },
              },
            },
          ],
          fixes: [
            {
              description: {
                text: v.recommendation,
              },
            },
          ],
        })),
      },
    ],
  };

  return JSON.stringify(sarifLog, null, 2);
}
