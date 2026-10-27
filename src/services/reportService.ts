import { securityUtils } from '../utils/security';
import { logger } from '../utils/logger';

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  reportedUserId: string;
  reportedUserName?: string;
  promptId?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  actionTaken?: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_REPORTS_KEY = 'ph_user_reports';

const getLocalReports = (): UserReport[] => {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalReport = (report: UserReport): void => {
  try {
    const existing = getLocalReports();
    const updated = [report, ...existing.filter((r) => r.id !== report.id)];
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (err) {
    logger.warn('[reportService] Failed to cache local report:', err);
  }
};

export const reportService = {
  async getReporterStatus(_reporterId: string): Promise<{ isBanned: boolean; isBlocked: boolean; warningLevel: string; count: number; reportCount: number }> {
    return { isBanned: false, isBlocked: false, warningLevel: 'none', count: 0, reportCount: 0 };
  },

  async reportPrompt(params: {
    promptId: string;
    promptTitle?: string;
    authorId?: string;
    authorName?: string;
    reporterId: string;
    reporterName?: string;
    reason: string;
    details?: string;
    reportedUserId?: string;
    reportedUserName?: string;
  }): Promise<{ success: boolean; id: string }> {
    return this.submitReport({
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      reportedUserId: params.reportedUserId || 'unknown',
      reportedUserName: params.reportedUserName,
      promptId: params.promptId,
      reason: params.reason,
      details: params.details,
    });
  },
  async submitReport(params: {
    reporterId: string;
    reporterName?: string;
    reportedUserId: string;
    reportedUserName?: string;
    promptId?: string;
    reason: string;
    details?: string;
  }): Promise<{ success: boolean; id: string }> {
    const cleanReason = securityUtils.sanitizeText(params.reason.trim());
    const cleanDetails = params.details ? securityUtils.sanitizeText(params.details.trim()) : '';

    const reportId = securityUtils.generateUUID();
    const now = new Date().toISOString();

    const reportItem: UserReport = {
      id: reportId,
      reporterId: params.reporterId,
      reporterName: params.reporterName || 'Anonymous Reporter',
      reportedUserId: params.reportedUserId,
      reportedUserName: params.reportedUserName || 'User',
      promptId: params.promptId,
      reason: cleanReason,
      details: cleanDetails,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    saveLocalReport(reportItem);
    return { success: true, id: reportId };
  },

  async fetchAdminReports(): Promise<UserReport[]> {
    return getLocalReports();
  },

  async updateReportStatus(
    reportId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    actionTaken?: string
  ): Promise<boolean> {
    const reports = getLocalReports();
    const target = reports.find((r) => r.id === reportId);
    if (target) {
      target.status = status;
      target.actionTaken = actionTaken || '';
      target.updatedAt = new Date().toISOString();
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
    }
    return true;
  },

  async submitPromptReport(params: {
    promptId: string;
    reason: string;
    details?: string;
    promptTitle?: string;
    category?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const reportId = securityUtils.generateUUID();
    const now = new Date().toISOString();

    const reportItem: UserReport = {
      id: reportId,
      reporterId: 'current_user',
      reporterName: 'User',
      reportedUserId: 'creator',
      reportedUserName: params.promptTitle || 'Prompt Creator',
      promptId: params.promptId,
      reason: params.reason,
      details: params.details || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    saveLocalReport(reportItem);
    try {
      localStorage.setItem(`ph_reported_prompt_${params.promptId}`, 'true');
    } catch {}

    return { success: true };
  },

  async hasUserReportedPrompt(promptId: string): Promise<boolean> {
    try {
      return localStorage.getItem(`ph_reported_prompt_${promptId}`) === 'true';
    } catch {
      return false;
    }
  },
};
