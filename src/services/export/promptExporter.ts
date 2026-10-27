/**
 * Multi-IDE & Multi-Format Prompt Export Engine
 *
 * Converts canonical PromptHub prompt definitions into clean, readable,
 * and platform-specific configuration files and code snippets:
 * - Standard Markdown (.md)
 * - Open Prompt JSON (.json)
 * - Plain Text (.txt)
 * - Python / LangChain SDK (.py)
 * - TypeScript / Node SDK (.ts)
 * - Cursor Rules (.cursor/rules/[slug].mdc)
 * - Claude Code Agent (.claude/agents/[slug].md)
 * - OpenAI Codex Agent (.codex/agents/[slug].toml)
 * - Google Antigravity Skill (.agents/skills/[slug]/SKILL.md)
 * - CSV Tabular Dataset (.csv)
 * - SARIF 2.1.0 Security Report (.sarif.json)
 */

import { scanPromptSecurity } from '../ai/promptSecurityScanner';
import { exportToSarif } from './sarifExporter';

export interface ExportPromptData {
  title: string;
  slug?: string;
  description: string;
  template: string;
  category?: string;
  author?: string;
  license?: string;
  version?: string;
  model?: string;
  variables?: Array<{ name: string; description?: string; defaultValue?: string }>;
  tags?: string[];
}

export type ExportFormat =
  | 'markdown'
  | 'word'
  | 'json'
  | 'text'
  | 'python'
  | 'typescript'
  | 'cursor_rule'
  | 'claude_code'
  | 'codex_toml'
  | 'antigravity_skill'
  | 'csv'
  | 'sarif';

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportPrompt(data: ExportPromptData, format: ExportFormat): ExportResult {
  const safeSlug = (data.slug || data.title || 'prompt')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'prompt';

  const title = data.title || 'Untitled Prompt';
  const description = data.description || '';
  const template = data.template || '';
  const category = data.category || 'General';
  const author = data.author || 'PromptHub Author';
  const version = data.version || '1.0.0';
  const license = data.license || 'MIT';
  const model = data.model || 'openai/gpt-4o';
  const tags = data.tags || [];
  const variables = data.variables || [];

  switch (format) {
    case 'text': {
      const crlf = '\r\n';
      let content = `================================================================================${crlf}` +
`${title.toUpperCase()}${crlf}` +
`================================================================================${crlf}` +
`Category : ${category}${crlf}` +
`Author   : @${author}${crlf}` +
`Model    : ${model}${crlf}` +
`Version  : ${version}${crlf}` +
`License  : ${license}${crlf}` +
(tags.length > 0 ? `Tags     : ${tags.join(', ')}${crlf}` : '') +
`--------------------------------------------------------------------------------${crlf}` +
`DESCRIPTION${crlf}` +
`--------------------------------------------------------------------------------${crlf}` +
`${description || 'No description provided.'}${crlf}${crlf}` +
`--------------------------------------------------------------------------------${crlf}` +
`PROMPT TEMPLATE${crlf}` +
`--------------------------------------------------------------------------------${crlf}` +
`${template}${crlf}`;

      if (variables.length > 0) {
        content += `${crlf}--------------------------------------------------------------------------------${crlf}DYNAMIC VARIABLES${crlf}--------------------------------------------------------------------------------${crlf}`;
        variables.forEach((v) => {
          content += `- {{${v.name}}}: ${v.description || 'Variable input'}${v.defaultValue ? ` (default: "${v.defaultValue}")` : ''}${crlf}`;
        });
      }
      content += `${crlf}================================================================================${crlf}Exported from PromptHub.cloud (${new Date().toISOString().split('T')[0]})${crlf}================================================================================${crlf}`;

      return {
        format,
        filename: `${safeSlug}.txt`,
        mimeType: 'text/plain;charset=utf-8',
        content,
      };
    }

    case 'markdown': {
      const crlf = '\r\n';
      let content = `# ${title}${crlf}${crlf}` +
`> ${description || 'Prompt template exported from PromptHub.'}${crlf}${crlf}` +
`### Prompt Specifications${crlf}${crlf}` +
`| Attribute | Details |${crlf}` +
`| :--- | :--- |${crlf}` +
`| **Category** | ${category} |${crlf}` +
`| **Target Model** | \`${model}\` |${crlf}` +
`| **Author** | @${author} |${crlf}` +
`| **Version** | ${version} |${crlf}` +
`| **License** | ${license} |${crlf}`;

      if (tags.length > 0) {
        content += `| **Tags** | ${tags.map((t) => `\`#${t}\``).join(', ')} |${crlf}`;
      }

      content += `${crlf}---${crlf}${crlf}## Prompt Instructions & Template${crlf}${crlf}\`\`\`markdown${crlf}${template}${crlf}\`\`\`${crlf}`;

      if (variables.length > 0) {
        content += `${crlf}## Configurable Variables${crlf}${crlf}| Variable | Default Value | Description |${crlf}| :--- | :--- | :--- |${crlf}`;
        variables.forEach((v) => {
          content += `| \`{{${v.name}}}\` | \`${v.defaultValue || '-'}\` | ${v.description || '-'} |${crlf}`;
        });
      }

      content += `${crlf}---${crlf}*Exported from [PromptHub.cloud](https://prompthub.cloud) on ${new Date().toISOString().split('T')[0]}*${crlf}`;

      return {
        format,
        filename: `${safeSlug}.md`,
        mimeType: 'text/markdown;charset=utf-8',
        content,
      };
    }

    case 'word': {
      const crlf = '\r\n';
      const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>${crlf}` +
`<head>${crlf}` +
`<meta charset="utf-8">${crlf}` +
`<!--[if gte mso 9]>${crlf}` +
`<xml>${crlf}` +
`  <w:WordDocument>${crlf}` +
`    <w:View>Print</w:View>${crlf}` +
`    <w:Zoom>100</w:Zoom>${crlf}` +
`    <w:DoNotOptimizeForBrowser/>${crlf}` +
`  </w:WordDocument>${crlf}` +
`</xml>${crlf}` +
`<![endif]-->${crlf}` +
`<title>${escapeHtml(title)}</title>${crlf}` +
`<style>${crlf}` +
`  body { font-family: 'Outfit', sans-serif; font-size: 11pt; line-height: 1.6; color: #000000; background-color: #FFFFFF; margin: 32px; }${crlf}` +
`  h1 { font-family: 'Outfit', sans-serif; font-size: 20pt; color: #000000; font-weight: 700; margin-top: 0; margin-bottom: 8px; }${crlf}` +
`  .description { font-style: italic; color: #2C3E50; background: #F0EDCE; border: 1px solid #D6D1A8; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; font-size: 11pt; }${crlf}` +
`  .section-heading { font-family: 'Outfit', sans-serif; font-size: 13pt; font-weight: 700; color: #2C3E50; border-bottom: 2px solid #D6D1A8; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }${crlf}` +
`  table.specs { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10.5pt; }${crlf}` +
`  table.specs th, table.specs td { border: 1px solid #D6D1A8; padding: 8px 12px; text-align: left; }${crlf}` +
`  table.specs th { background-color: #F0EDCE; color: #2C3E50; width: 28%; font-weight: 600; }${crlf}` +
`  table.specs td { background-color: #FFFFFF; color: #000000; }${crlf}` +
`  .code-container { background-color: #F0EDCE; border: 1px solid #D6D1A8; border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 10pt; line-height: 1.5; white-space: pre-wrap; word-break: break-word; color: #000000; margin-bottom: 20px; }${crlf}` +
`  .variable-badge { background-color: #E8E5C3; border: 1px solid #D6D1A8; color: #2C3E50; font-family: 'JetBrains Mono', monospace; padding: 2px 6px; border-radius: 4px; font-size: 9.5pt; font-weight: 600; }${crlf}` +
`  .footer { margin-top: 32px; font-size: 9pt; color: #596B7B; border-top: 1px solid #D6D1A8; padding-top: 12px; text-align: center; }${crlf}` +
`</style>${crlf}` +
`</head>${crlf}` +
`<body>${crlf}` +
`  <h1>${escapeHtml(title)}</h1>${crlf}` +
`  <div class="description">${escapeHtml(description || 'Prompt template exported from PromptHub.')}</div>${crlf}${crlf}` +
`  <div class="section-heading">Prompt Specifications</div>${crlf}` +
`  <table class="specs">${crlf}` +
`    <tr><th>Category</th><td>${escapeHtml(category)}</td></tr>${crlf}` +
`    <tr><th>Target Model</th><td><code>${escapeHtml(model)}</code></td></tr>${crlf}` +
`    <tr><th>Author</th><td>@${escapeHtml(author)}</td></tr>${crlf}` +
`    <tr><th>Version</th><td>${escapeHtml(version)}</td></tr>${crlf}` +
`    <tr><th>License</th><td>${escapeHtml(license)}</td></tr>${crlf}` +
(tags.length > 0 ? `    <tr><th>Tags</th><td>${escapeHtml(tags.join(', '))}</td></tr>${crlf}` : '') +
`  </table>${crlf}${crlf}` +
`  <div class="section-heading">Prompt Instructions &amp; Template</div>${crlf}` +
`  <div class="code-container">${escapeHtml(template)}</div>${crlf}` +
(variables.length > 0 ? `${crlf}  <div class="section-heading">Configurable Parameters (${variables.length})</div>${crlf}` +
`  <table class="specs">${crlf}` +
`    <thead>${crlf}` +
`      <tr>${crlf}` +
`        <th style="width: 30%;">Variable</th>${crlf}` +
`        <th style="width: 30%;">Default Value</th>${crlf}` +
`        <th style="width: 40%;">Description</th>${crlf}` +
`      </tr>${crlf}` +
`    </thead>${crlf}` +
`    <tbody>${crlf}` +
variables.map((v) => `      <tr><td><span class="variable-badge">{{${escapeHtml(v.name)}}}</span></td><td><code>${escapeHtml(v.defaultValue || '-')}</code></td><td>${escapeHtml(v.description || '-')}</td></tr>`).join(crlf) + `${crlf}` +
`    </tbody>${crlf}` +
`  </table>${crlf}` : '') +
`${crlf}  <div class="footer">${crlf}` +
`    Exported from <strong>PromptHub.cloud</strong> &bull; Generated on ${formattedDate}${crlf}` +
`  </div>${crlf}` +
`</body>${crlf}` +
`</html>`;

      return {
        format,
        filename: `${safeSlug}.doc`,
        mimeType: 'application/msword;charset=utf-8',
        content,
      };
    }

    case 'json': {
      const jsonPayload = {
        $schema: 'https://prompthub.cloud/schema/v1/prompt.json',
        title,
        slug: safeSlug,
        description,
        category,
        model,
        version,
        author,
        license,
        template,
        variables: variables.map((v) => ({
          name: v.name,
          defaultValue: v.defaultValue || '',
          description: v.description || '',
          required: !v.defaultValue,
        })),
        tags,
        exportedAt: new Date().toISOString(),
        platform: 'PromptHub.cloud',
      };

      return {
        format,
        filename: `${safeSlug}.json`,
        mimeType: 'application/json',
        content: JSON.stringify(jsonPayload, null, 2),
      };
    }

    case 'python': {
      const varNames = variables.map((v) => v.name);
      const varDictStr = varNames.length > 0
        ? varNames.map((n) => `        "${n}": "${data.variables?.find((v) => v.name === n)?.defaultValue || 'YOUR_VALUE'}"`).join(',\n')
        : '        # No dynamic variables required';

      const content = `"""
${title}
${description}

Exported from PromptHub.cloud (${new Date().toISOString().split('T')[0]})
Model: ${model} | Version: ${version}
"""

import os
from openai import OpenAI

# 1. Initialize API Client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "your-api-key"))

# 2. Define Raw Prompt Template
PROMPT_TEMPLATE = """${template.replace(/"""/g, '\\"\\"\\"')}"""

# 3. Helper to format prompt with dynamic variables
def format_prompt(template: str, **kwargs) -> str:
    rendered = template
    for key, value in kwargs.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return rendered

def main():
    # 4. Supply Dynamic Variables
    variables = {
${varDictStr}
    }

    formatted_prompt = format_prompt(PROMPT_TEMPLATE, **variables)
    print("--- Formatted Prompt ---")
    print(formatted_prompt)
    print("------------------------")

    # 5. Execute against target LLM
    response = client.chat.completions.create(
        model="${model.includes('/') ? model.split('/')[1] : model}",
        messages=[
            {"role": "system", "content": "You are a helpful and precise AI assistant."},
            {"role": "user", "content": formatted_prompt}
        ],
        temperature=0.7,
    )

    print("\\n--- Model Response ---")
    print(response.choices[0].message.content)

if __name__ == "__main__":
    main()
`;
      return {
        format,
        filename: `${safeSlug}.py`,
        mimeType: 'text/x-python',
        content,
      };
    }

    case 'typescript': {
      const varNames = variables.map((v) => v.name);
      const varDictStr = varNames.length > 0
        ? varNames.map((n) => `  ${n}: "${data.variables?.find((v) => v.name === n)?.defaultValue || 'YOUR_VALUE'}"`).join(',\n')
        : '  // No dynamic variables';

      const content = `/**
 * ${title}
 * ${description}
 *
 * Exported from PromptHub.cloud (${new Date().toISOString().split('T')[0]})
 * Model: ${model} | Version: ${version}
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
});

export const PROMPT_TEMPLATE = \`${template.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;

export interface PromptVariables {
  ${varNames.map((n) => `${n}?: string;`).join('\n  ')}
}

export function formatPrompt(template: string, vars: PromptVariables): string {
  let rendered = template;
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      rendered = rendered.replace(new RegExp(\`\\\\{\\\\{ \${key} \\\\}\\\\}|\\\\{\\\\{\${key}\\\\}\\\\}\`, 'g'), String(value));
    }
  }
  return rendered;
}

export async function runPrompt(vars: PromptVariables = {}) {
  const formattedPrompt = formatPrompt(PROMPT_TEMPLATE, vars);

  const response = await openai.chat.completions.create({
    model: '${model.includes('/') ? model.split('/')[1] : model}',
    messages: [
      { role: 'system', content: 'You are a helpful and precise AI assistant.' },
      { role: 'user', content: formattedPrompt },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content;
}

// Example Execution
async function main() {
  const vars: PromptVariables = {
${varDictStr}
  };

  console.log('Sending prompt to LLM...');
  const result = await runPrompt(vars);
  console.log('\\n--- Response ---\\n', result);
}

if (require.main === module) {
  main().catch(console.error);
}
`;
      return {
        format,
        filename: `${safeSlug}.ts`,
        mimeType: 'text/typescript',
        content,
      };
    }

    case 'claude_code': {
      const content = `---
name: ${title}
description: ${description || title}
category: ${category}
version: ${version}
author: ${author}
license: ${license}
---

# ${title}

${template}
`;
      return {
        format,
        filename: `${safeSlug}.md`,
        mimeType: 'text/markdown',
        content,
      };
    }

    case 'cursor_rule': {
      const content = `---
description: ${description || title}
globs: ["*"]
alwaysApply: false
---

# ${title}

${template}
`;
      return {
        format,
        filename: `${safeSlug}.mdc`,
        mimeType: 'text/plain;charset=utf-8',
        content,
      };
    }

    case 'codex_toml': {
      const content = `[agent]
name = "${title.replace(/"/g, '\\"')}"
description = "${description.replace(/"/g, '\\"') || title.replace(/"/g, '\\"')}"
version = "${version}"
category = "${category}"
author = "${author}"

[prompt]
system = """
${template}
"""
`;
      return {
        format,
        filename: `${safeSlug}.toml`,
        mimeType: 'application/toml',
        content,
      };
    }

    case 'antigravity_skill': {
      const content = `---
name: ${safeSlug}
description: ${description || title}
version: ${version}
---

# ${title}

## Purpose
${description || 'Production prompt template exported from PromptHub.'}

## Instructions
${template}
`;
      return {
        format,
        filename: 'SKILL.md',
        mimeType: 'text/markdown',
        content,
      };
    }

    case 'csv': {
      const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const header = 'Title,Slug,Category,Model,Version,Author,License,Description,Template,Variables,Tags';
      const row = [
        escapeCsv(title),
        escapeCsv(safeSlug),
        escapeCsv(category),
        escapeCsv(model),
        escapeCsv(version),
        escapeCsv(author),
        escapeCsv(license),
        escapeCsv(description),
        escapeCsv(template),
        escapeCsv(variables.map((v) => v.name).join('; ')),
        escapeCsv(tags.join('; ')),
      ].join(',');

      return {
        format,
        filename: `${safeSlug}.csv`,
        mimeType: 'text/csv',
        content: `${header}\n${row}\n`,
      };
    }

    case 'sarif': {
      const scanReport = scanPromptSecurity(template);
      const content = exportToSarif({
        promptTitle: title,
        promptSlug: safeSlug,
        report: scanReport,
        version,
      });
      return {
        format,
        filename: `${safeSlug}.sarif.json`,
        mimeType: 'application/json',
        content,
      };
    }

    default: {
      return {
        format: 'markdown',
        filename: `${safeSlug}.md`,
        mimeType: 'text/markdown',
        content: template,
      };
    }
  }
}

/**
 * Export multiple prompts as a unified collection JSON bundle or Markdown book.
 */
export function exportCollectionBundle(
  collectionName: string,
  prompts: ExportPromptData[],
  format: 'json' | 'markdown' | 'csv' = 'json'
): ExportResult {
  const safeSlug = collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'collection';

  if (format === 'markdown') {
    let content = `# ${collectionName}\n\n`;
    content += `> PromptHub Collection Export containing ${prompts.length} prompt architecture${prompts.length === 1 ? '' : 's'}.\n\n`;
    content += `**Exported At**: ${new Date().toISOString().split('T')[0]}\n\n---\n\n`;

    prompts.forEach((p, idx) => {
      content += `## ${idx + 1}. ${p.title}\n\n`;
      if (p.description) content += `*${p.description}*\n\n`;
      content += `**Category**: \`${p.category || 'General'}\` | **Model**: \`${p.model || 'OpenAI'}\`\n\n`;
      content += `\`\`\`markdown\n${p.template}\n\`\`\`\n\n`;
      if (p.variables && p.variables.length > 0) {
        content += `**Variables**: ${p.variables.map((v) => `\`{{${v.name}}}\``).join(', ')}\n\n`;
      }
      content += `---\n\n`;
    });

    return {
      format: 'markdown',
      filename: `${safeSlug}-collection.md`,
      mimeType: 'text/markdown',
      content,
    };
  }

  if (format === 'csv') {
    const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const header = 'Title,Category,Model,Description,Template,Variables,Tags';
    const rows = prompts.map((p) =>
      [
        escapeCsv(p.title),
        escapeCsv(p.category || 'General'),
        escapeCsv(p.model || 'openai/gpt-4o'),
        escapeCsv(p.description),
        escapeCsv(p.template),
        escapeCsv((p.variables || []).map((v) => v.name).join('; ')),
        escapeCsv((p.tags || []).join('; ')),
      ].join(',')
    );

    return {
      format: 'csv',
      filename: `${safeSlug}-collection.csv`,
      mimeType: 'text/csv',
      content: `${header}\n${rows.join('\n')}\n`,
    };
  }

  // Default JSON Bundle
  const payload = {
    schema: 'https://prompthub.cloud/schema/v1/collection-bundle.json',
    collectionName,
    promptCount: prompts.length,
    exportedAt: new Date().toISOString(),
    prompts: prompts.map((p) => ({
      title: p.title,
      slug: (p.slug || p.title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: p.description,
      category: p.category || 'General',
      model: p.model || 'openai/gpt-4o',
      template: p.template,
      variables: p.variables || [],
      tags: p.tags || [],
    })),
  };

  return {
    format: 'json',
    filename: `${safeSlug}-bundle.json`,
    mimeType: 'application/json',
    content: JSON.stringify(payload, null, 2),
  };
}

/**
 * Generates a clean, professional Markdown audit report from prompt analyzer results.
 */
export function exportAuditReportToMarkdown(promptText: string, results: any, modelName?: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const overall = results?.overallScore ?? results?.score ?? 'N/A';
  const level = results?.level || (typeof overall === 'number' ? (overall >= 85 ? 'Expert' : overall >= 70 ? 'Advanced' : overall >= 40 ? 'Intermediate' : 'Beginner') : 'Evaluated');

  let report = `# PromptHub AI Prompt Architecture & Security Audit Report

- **Date of Audit:** ${dateStr}
- **Evaluated Target Model:** ${modelName || results?.actualModel || 'Frontier Model'}
- **Overall Engineering Score:** **${overall}/100** (${level})
- **Evaluator Engine:** PromptHub Deterministic 6-Rubric Audit Suite

---

## 1. Executive Summary & Deterministic Rubrics

| Rubric | Score | Benchmark Target | Verdict |
| :--- | :--- | :--- | :--- |
| **Role & Persona Clarity** | ${results?.clarity ?? 'N/A'}% | >= 80% | ${(results?.clarity ?? 0) >= 80 ? 'Pass' : 'Requires Hardening'} |
| **Context & Domain Anchoring** | ${results?.context ?? 'N/A'}% | >= 75% | ${(results?.context ?? 0) >= 75 ? 'Pass' : 'Requires Hardening'} |
| **Boundary & Constraints** | ${results?.constraints ?? 'N/A'}% | >= 85% | ${(results?.constraints ?? 0) >= 85 ? 'Pass' : 'Vulnerable'} |
| **Output Schema Definition** | ${results?.outputDefinition ?? 'N/A'}% | >= 80% | ${(results?.outputDefinition ?? 0) >= 80 ? 'Pass' : 'Ambiguous'} |
| **Specificity & Instruction Depth** | ${results?.specificity ?? 'N/A'}% | >= 75% | ${(results?.specificity ?? 0) >= 75 ? 'Pass' : 'Requires Hardening'} |
| **Structural Modularity** | ${results?.structure ?? 'N/A'}% | >= 75% | ${(results?.structure ?? 0) >= 75 ? 'Pass' : 'Monolithic'} |

---

## 2. Risk & Vulnerability Analysis

- **Prompt Injection Risk:** \`${results?.securityRisks?.injection ?? results?.injectionRisk ?? 'Low'}\`
- **Jailbreak / Boundary Escape:** \`${results?.securityRisks?.jailbreak ?? results?.jailbreakRisk ?? 'Low'}\`
- **System Leakage Vulnerability:** \`${results?.securityRisks?.leakage ?? results?.leakageRisk ?? 'Low'}\`

---

## 3. Original Prompt (Pre-Audit)

\`\`\`text
${promptText}
\`\`\`

---

## 4. Hardened Production Architecture

\`\`\`markdown
${results?.improved || promptText}
\`\`\`

---

## 5. Architectural Recommendations

${(results?.recommendations || results?.suggestions || [])
  .map((rec: string, idx: number) => `${idx + 1}. ${rec}`)
  .join('\n') || '- Ensure explicit negative constraints are defined.\n- Enforce typed output schemas (JSON/Markdown tables).\n- Provide 1-2 few-shot exemplar inputs and outputs.'}

---
*Report certified by [PromptHub Studio](https://prompthub.cloud) • Deterministic Quality Invariants Enforced*
`;

  return report;
}

/**
 * Generates an audit report as a structured JSON object for automated CI/CD gating.
 */
export function exportAuditReportToJson(promptText: string, results: any, modelName?: string): string {
  const payload = {
    schema: 'https://prompthub.cloud/schema/v1/prompt-audit-report.json',
    generatedAt: new Date().toISOString(),
    targetModel: modelName || results?.actualModel || 'openrouter/free',
    overallScore: results?.overallScore ?? results?.score ?? null,
    level: results?.level ?? null,
    scores: {
      clarity: results?.clarity ?? null,
      context: results?.context ?? null,
      constraints: results?.constraints ?? null,
      outputDefinition: results?.outputDefinition ?? null,
      specificity: results?.specificity ?? null,
      structure: results?.structure ?? null,
    },
    securityRisks: results?.securityRisks ?? {
      injection: results?.injectionRisk ?? 'Low',
      jailbreak: results?.jailbreakRisk ?? 'Low',
      leakage: results?.leakageRisk ?? 'Low',
    },
    originalPrompt: promptText,
    hardenedPrompt: results?.improved || null,
    recommendations: results?.recommendations || results?.suggestions || [],
  };

  return JSON.stringify(payload, null, 2);
}
