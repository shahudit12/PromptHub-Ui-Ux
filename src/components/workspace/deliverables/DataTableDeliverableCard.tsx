import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Calculator,
} from 'lucide-react';
import { DeliverableVersionPills, type DeliverableVersion } from './DeliverableVersionPills';

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'percent' | 'badge' | 'date';
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableRow {
  id: string | number;
  [key: string]: any;
}

export interface DataTableSummaryMetric {
  label: string;
  value: string | number;
}

export interface DataTableDeliverableData {
  title: string;
  subtitle?: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  summaryMetrics?: DataTableSummaryMetric[];
  filename?: string;
  version?: number;
  versions?: DeliverableVersion[];
}

export interface DataTableDeliverableCardProps {
  data?: Partial<DataTableDeliverableData>;
  onIterate?: (prompt: string) => void;
  onVersionChange?: (version: number) => void;
  onExportCsv?: (data: DataTableDeliverableData) => void;
  className?: string;
}

const DEFAULT_TABLE_DATA: DataTableDeliverableData = {
  title: 'Q3 Enterprise Product Tier & Revenue Contribution Matrix',
  subtitle: 'Normalized customer subscription volume, net recurring revenue, and unit margins across tiers',
  filename: 'enterprise-revenue-matrix.csv',
  version: 2,
  versions: [
    {
      version: 1,
      label: 'v1',
      summary: 'Initial raw extraction from CRM upload',
      timestamp: Date.now() - 5400000,
    },
    {
      version: 2,
      label: 'v2',
      summary: 'Added unit margin % and tier contribution totals',
      timestamp: Date.now() - 900000,
    },
  ],
  columns: [
    { key: 'tier', label: 'Subscription Tier', type: 'text', align: 'left', sortable: true },
    { key: 'activeWorkspaces', label: 'Workspaces', type: 'number', align: 'right', sortable: true },
    { key: 'arpu', label: 'ARPU / Mo', type: 'currency', align: 'right', sortable: true },
    { key: 'mrr', label: 'Monthly Run Rate', type: 'currency', align: 'right', sortable: true },
    { key: 'margin', label: 'Gross Margin', type: 'percent', align: 'right', sortable: true },
    { key: 'status', label: 'Tier Velocity', type: 'badge', align: 'center', sortable: true },
  ],
  rows: [
    {
      id: 'row_1',
      tier: 'Enterprise Custom Dedicated',
      activeWorkspaces: 84,
      arpu: '$4,250',
      mrr: '$357,000',
      margin: '88.5%',
      status: 'Surging',
    },
    {
      id: 'row_2',
      tier: 'Scale Studio Growth',
      activeWorkspaces: 420,
      arpu: '$799',
      mrr: '$335,580',
      margin: '82.0%',
      status: 'High Growth',
    },
    {
      id: 'row_3',
      tier: 'Team Autonomous Pro',
      activeWorkspaces: 1250,
      arpu: '$199',
      mrr: '$248,750',
      margin: '76.4%',
      status: 'Stable',
    },
    {
      id: 'row_4',
      tier: 'Developer BYOK Standard',
      activeWorkspaces: 3890,
      arpu: '$49',
      mrr: '$190,610',
      margin: '91.2%',
      status: 'Expanding',
    },
    {
      id: 'row_5',
      tier: 'Founders Starter Hub',
      activeWorkspaces: 2150,
      arpu: '$29',
      mrr: '$62,350',
      margin: '71.8%',
      status: 'Normal',
    },
    {
      id: 'row_6',
      tier: 'Academic & OSS Labs',
      activeWorkspaces: 940,
      arpu: '$15',
      mrr: '$14,100',
      margin: '64.0%',
      status: 'Subsidized',
    },
  ],
  summaryMetrics: [
    { label: 'Total MRR', value: '$1,208,390' },
    { label: 'Total Workspaces', value: '8,734' },
    { label: 'Blended Margin', value: '82.3%' },
    { label: 'Avg Tier ARPU', value: '$890' },
  ],
};

const TABLE_REVISION_CHIPS = [
  'Sort by highest MRR',
  'Filter top 3 tiers only',
  'Calculate annual run rate (ARR)',
  'Add churn risk projection column',
  'Export filtered dataset to CSV',
  'Highlight margins above 85%',
];

export const DataTableDeliverableCard: React.FC<DataTableDeliverableCardProps> = ({
  data = {},
  onIterate,
  onVersionChange,
  onExportCsv,
  className = '',
}) => {
  const mergedData: DataTableDeliverableData = {
    ...DEFAULT_TABLE_DATA,
    ...data,
  };

  const [activeVersion, setActiveVersion] = useState<number>(mergedData.version || 2);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return mergedData.rows;
    const query = searchQuery.toLowerCase().trim();
    return mergedData.rows.filter((row) =>
      mergedData.columns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      })
    );
  }, [mergedData.rows, mergedData.columns, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const col = mergedData.columns.find((c) => c.key === sortKey);
    const isNum = col?.type === 'number' || col?.type === 'currency' || col?.type === 'percent';

    return [...filteredRows].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (isNum) {
        // Strip currency, percentage, commas
        const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, '')) || 0;
        const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, '')) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortKey, sortOrder, mergedData.columns]);

  // CSV Generator
  const generateCsv = (): string => {
    const headers = mergedData.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const rows = sortedRows.map((row) =>
      mergedData.columns
        .map((col) => {
          const val = row[col.key];
          const text = val === null || val === undefined ? '' : String(val);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    return [headers, ...rows].join('\n');
  };

  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv(mergedData);
      return;
    }

    const csv = generateCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = mergedData.filename || 'data-deliverable.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    copyToClipboard(csv, 'download_csv');
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(sortedRows, null, 2);
    copyToClipboard(jsonStr, 'copy_json');
  };

  const handleVersionSelect = (v: number) => {
    setActiveVersion(v);
    if (onVersionChange) {
      onVersionChange(v);
    }
  };

  const renderBadge = (val: string) => {
    let colorClasses = 'bg-brand-primary/10 text-brand-primary border-brand-primary/20';
    if (val.toLowerCase().includes('surge') || val.toLowerCase().includes('high')) {
      colorClasses = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    } else if (val.toLowerCase().includes('subsid')) {
      colorClasses = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${colorClasses}`}>
        {val}
      </span>
    );
  };

  return (
    <div
      className={`w-full rounded-2xl bg-bg-secondary border border-border-default shadow-md overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      {/* ─── Header: Identification, Actions & Version Pills ─── */}
      <div className="p-4 sm:p-5 border-b border-border-subtle bg-bg-tertiary/40 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <TableIcon className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  DATA TABLE
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {sortedRows.length} rows • Sortable & Searchable
                </span>
              </div>
              <h3 className="text-sm font-semibold font-display text-text-primary">
                {mergedData.title}
              </h3>
            </div>
          </div>

          {/* Quick Action Tools: CSV & JSON Export */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Copy formatted JSON data to clipboard"
              aria-label="Copy JSON"
            >
              {copiedKey === 'copy_json' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="font-semibold text-brand-primary">Copied JSON!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span className="hidden sm:inline">Copy JSON</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-brand-primary hover:bg-brand-primary-hi text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download structured CSV file"
              aria-label="Export CSV"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Version Pills */}
        <DeliverableVersionPills
          versions={mergedData.versions || [1, 2]}
          activeVersion={activeVersion}
          onSelectVersion={handleVersionSelect}
          title="Data Iterations"
        />
      </div>

      {/* ─── Search & Filter Controls ─── */}
      <div className="px-4 py-3 sm:px-6 bg-bg-primary/20 border-b border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rows across all columns..."
            className="min-h-[44px] w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-bg-secondary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
            aria-label="Filter rows"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono text-text-muted">
          <span>
            Showing <strong className="text-text-primary font-bold">{sortedRows.length}</strong> of{' '}
            {mergedData.rows.length} records
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="min-h-[44px] min-w-[44px] px-2 py-1 text-[11px] text-brand-primary hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ─── Responsive Tabular Grid with Sticky Header ─── */}
      <div className="overflow-x-auto max-h-[440px] relative scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[620px]">
          {/* Sticky Header Row */}
          <thead className="sticky top-0 z-10 bg-bg-secondary border-b border-border-default shadow-3xs">
            <tr>
              {mergedData.columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    className={`py-3 px-4 text-xs font-mono font-bold text-text-primary uppercase tracking-wider ${alignClass} select-none`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 hover:text-brand-primary transition-colors cursor-pointer ${
                          col.align === 'right'
                            ? 'ml-auto justify-end'
                            : col.align === 'center'
                            ? 'mx-auto justify-center'
                            : 'justify-start'
                        }`}
                        title={`Sort by ${col.label}`}
                        aria-label={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-text-muted opacity-50 shrink-0" />
                        )}
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Alternating Rows */}
          <tbody className="divide-y divide-border-subtle text-xs">
            {sortedRows.length > 0 ? (
              sortedRows.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`transition-colors hover:bg-bg-tertiary/60 ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-bg-tertiary/20'
                  }`}
                >
                  {mergedData.columns.map((col) => {
                    const val = row[col.key];
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    return (
                      <td key={col.key} className={`py-3 px-4 font-mono ${alignClass}`}>
                        {col.type === 'badge' ? (
                          renderBadge(String(val))
                        ) : col.type === 'percent' || col.type === 'currency' ? (
                          <span className="font-semibold text-text-primary">{val}</span>
                        ) : (
                          <span className="text-text-secondary">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={mergedData.columns.length}
                  className="py-8 text-center text-xs font-mono text-text-muted bg-bg-secondary"
                >
                  No matching records found for "{searchQuery}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Summary Statistics Footer ─── */}
      {mergedData.summaryMetrics && mergedData.summaryMetrics.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-border-default bg-bg-tertiary/50">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2.5">
            <Calculator className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>Dataset Summary Aggregates:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mergedData.summaryMetrics.map((metric, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-bg-secondary border border-border-subtle space-y-1"
              >
                <span className="text-[10px] font-mono text-text-muted block truncate">
                  {metric.label}
                </span>
                <span className="text-base font-display font-bold text-text-primary block">
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Quick Iteration Revision Chips ─── */}
      <div className="p-4 sm:p-5 border-t border-border-subtle bg-bg-tertiary/30">
        <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span>Quick Iteration Revisions:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABLE_REVISION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (onIterate) {
                  onIterate(chip);
                } else {
                  copyToClipboard(`Iterate table: "${chip}"`, `chip_${chip}`);
                }
              }}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title={`Request table revision: "${chip}"`}
              aria-label={`Revise table: ${chip}`}
            >
              <Sparkles className="w-3 h-3 text-brand-accent shrink-0" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
