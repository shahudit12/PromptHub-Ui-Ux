import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  FileCode 
} from 'lucide-react';
import { exportPrompt, type ExportFormat, type ExportPromptData } from '../../services/export/promptExporter';

export interface ExportPanelProps {
  promptData: ExportPromptData;
}

const EXPORT_FORMATS: Array<{ id: ExportFormat; name: string; ext: string; description: string; targetIde: string }> = [
  { id: 'word', name: 'Word Document (.doc)', ext: '.doc', description: 'Formatted Microsoft Word & WordCraft document with styled callouts and tables', targetIde: 'Microsoft Word / Docs' },
  { id: 'markdown', name: 'Standard Markdown (.md)', ext: '.md', description: 'Universal GitHub Flavored Markdown with clean tables and specifications', targetIde: 'Universal' },
  { id: 'json', name: 'Open Prompt Schema (.json)', ext: '.json', description: 'Interoperable, pretty-printed JSON schema with typed dynamic variables', targetIde: 'Universal / API' },
  { id: 'text', name: 'Plain Text Prompt (.txt)', ext: '.txt', description: 'Clean, human-readable text document with instructions and variables legend', targetIde: 'Direct Paste' },
  { id: 'python', name: 'Python / LangChain (.py)', ext: '.py', description: 'Ready-to-run Python snippet with variable interpolator and OpenAI client', targetIde: 'Python' },
  { id: 'typescript', name: 'TypeScript / Node (.ts)', ext: '.ts', description: 'Fully typed TypeScript snippet with interface types and prompt runner', targetIde: 'Node.js / Web' },
  { id: 'cursor_rule', name: 'Cursor Rules (.mdc)', ext: '.mdc', description: 'Cursor IDE contextual prompt rule placed in .cursor/rules/', targetIde: 'Cursor IDE' },
  { id: 'claude_code', name: 'Claude Code Agent (.md)', ext: '.md', description: 'Claude Code CLI subagent prompt placed in .claude/agents/', targetIde: 'Claude Code' },
  { id: 'codex_toml', name: 'OpenAI Codex Agent (.toml)', ext: '.toml', description: 'OpenAI Codex agent rule placed in .codex/agents/', targetIde: 'Codex' },
  { id: 'antigravity_skill', name: 'Google Antigravity Skill (SKILL.md)', ext: 'SKILL.md', description: 'Antigravity & Gemini CLI skill package in .agents/skills/', targetIde: 'Antigravity' },
  { id: 'csv', name: 'CSV Tabular Dataset (.csv)', ext: '.csv', description: 'Spreadsheet-ready comma-separated row with escaped prompt fields', targetIde: 'Spreadsheets / Excel' },
  { id: 'sarif', name: 'SARIF 2.1.0 Security Report (.sarif.json)', ext: '.sarif.json', description: 'GitHub Advanced Security & CI static security scan output', targetIde: 'GitHub / CI' },
];

export const ExportPanel: React.FC<ExportPanelProps> = ({ promptData }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('cursor_rule');
  const [copied, setCopied] = useState(false);

  const exportResult = exportPrompt(promptData, selectedFormat);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-bg-secondary border border-border-default shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-primary-light text-brand-primary">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Multi-IDE & CI Export Studio</h3>
            <p className="text-xs text-text-muted">
              Convert your PromptHub prompt definition into platform-specific configuration formats or CI security scans.
            </p>
          </div>
        </div>

        {/* Format Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
          {EXPORT_FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-primary-light/50 border-brand-primary text-text-primary ring-1 ring-brand-primary/20'
                    : 'bg-bg-primary border-border-default text-text-secondary hover:border-border-hover'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-text-primary">{fmt.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-muted">
                    {fmt.ext}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                  {fmt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Preview & Actions */}
      <div className="rounded-xl border border-border-default bg-bg-secondary overflow-hidden shadow-sm space-y-0">
        {/* Preview Header */}
        <div className="flex items-center justify-between p-3 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-mono font-semibold text-text-primary">
              {exportResult.filename}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <pre className="p-4 font-mono text-xs text-text-primary overflow-x-auto max-h-[350px] leading-relaxed bg-bg-primary/50 whitespace-pre-wrap select-all">
          {exportResult.content}
        </pre>

        {/* IDE Placement Guidance */}
        <div className="p-3 border-t border-border-default bg-bg-primary/80 flex items-start gap-2 text-xs text-text-secondary">
          <div className="mt-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-primary-light text-brand-primary shrink-0">
            TIP
          </div>
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            {selectedFormat === 'cursor_rule' && (
              <p>
                Save inside your repository at <code className="font-mono text-brand-primary font-bold">.cursor/rules/{exportResult.filename}</code>. To view on Windows, open with <strong>Notepad</strong>, <strong>VS Code</strong>, or <strong>Cursor</strong> (or click <strong>Copy</strong> above).
              </p>
            )}
            {selectedFormat === 'claude_code' && (
              <p>
                Save inside your repository at <code className="font-mono text-brand-primary font-bold">.claude/agents/{exportResult.filename}</code> for Claude Code CLI.
              </p>
            )}
            {selectedFormat === 'codex_toml' && (
              <p>
                Save inside your repository at <code className="font-mono text-brand-primary font-bold">.codex/agents/{exportResult.filename}</code> for OpenAI Codex.
              </p>
            )}
            {selectedFormat === 'antigravity_skill' && (
              <p>
                Place in <code className="font-mono text-brand-primary font-bold">.agents/skills/{promptData.title.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}/SKILL.md</code> for Gemini &amp; Antigravity agents.
              </p>
            )}
            {!['cursor_rule', 'claude_code', 'codex_toml', 'antigravity_skill'].includes(selectedFormat) && (
              <p>
                Ready for use. You can copy the code snippet directly into your project or download the file.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
