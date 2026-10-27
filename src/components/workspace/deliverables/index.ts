/**
 * src/components/workspace/deliverables/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel export for outcome-oriented deliverable cards in PromptHub Workspace.
 * Provides specialized, accessible inline cards for Ads, Reports, Data Tables,
 * Code Web Apps, and unified historical iteration version pills.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export { DeliverableVersionPills } from './DeliverableVersionPills';
export type {
  DeliverableVersion,
  DeliverableVersionPillsProps,
} from './DeliverableVersionPills';

export { AdDeliverableCard } from './AdDeliverableCard';
export type {
  AdHeadlineVariant,
  AdCopyVariant,
  AdTargetingStrategy,
  AdDeliverableData,
  AdDeliverableCardProps,
} from './AdDeliverableCard';

export { ReportDeliverableCard } from './ReportDeliverableCard';
export type {
  ReportKpiMetric,
  ReportSection,
  ReportRecommendation,
  ReportDeliverableData,
  ReportDeliverableCardProps,
} from './ReportDeliverableCard';

export { DataTableDeliverableCard } from './DataTableDeliverableCard';
export type {
  DataTableColumn,
  DataTableRow,
  DataTableSummaryMetric,
  DataTableDeliverableData,
  DataTableDeliverableCardProps,
} from './DataTableDeliverableCard';

export { CodeAppDeliverableCard } from './CodeAppDeliverableCard';
export type {
  CodeAppFile,
  CodeAppDeliverableData,
  CodeAppDeliverableCardProps,
} from './CodeAppDeliverableCard';
