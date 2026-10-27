// Audit Logging Repository — Standalone Client Mode
// Zero database queries, zero external network requests
import { logger } from '../utils/logger';

export interface AuditEntry {
  id?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  orgId?: string;
  details?: Record<string, any>;
  createdAt?: string;
}

export class AuditRepository {
  static async log(entry: AuditEntry): Promise<void> {
    logger.info(`[AUDIT LOG] ${entry.action} on ${entry.resourceType}:${entry.resourceId || 'N/A'}`);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('prompthub_audit_logs');
        const logs: AuditEntry[] = stored ? JSON.parse(stored) : [];
        logs.unshift({ ...entry, id: `audit_${Date.now()}`, createdAt: new Date().toISOString() });
        localStorage.setItem('prompthub_audit_logs', JSON.stringify(logs.slice(0, 100)));
      } catch {}
    }
  }
}
