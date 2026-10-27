/**
 * src/services/ai/executionTracer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Secure AI Execution Tracing Engine for PromptHub BYOK Architecture.
 * Records internal telemetry, stripped parameter audits, and execution duration.
 *
 * STRICT SECURITY INVARIANTS:
 * 1. NEVER log raw API keys or Authorization headers.
 * 2. All key identifiers use one-way SHA-256 cryptographic fingerprints.
 * 3. Never leak sensitive secrets into error logs or client metadata.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ExecutionTraceRecord {
  requestId: string;
  timestamp: number;
  provider: string;
  requestedModelId: string;
  resolvedModelId: string;
  adapter: string;
  endpointFamily: string;
  apiVersion?: string;
  keyFingerprint: string; // e.g. "sha256:3a4b9c..."
  payloadFieldsSent: string[];
  payloadFieldsRemoved: string[];
  responseStatus?: number;
  normalizedErrorCode?: string;
  durationMs: number;
  status: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Compute non-reversible SHA-256 fingerprint of an API key for safe debugging.
 */
export async function computeKeyFingerprint(key: string): Promise<string> {
  if (!key || typeof key !== 'string') return 'none';
  const clean = key.trim();
  if (!clean) return 'none';

  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(clean);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `sha256:${hashHex.slice(0, 12)}`;
    }
  } catch {}

  // Synchronous fallback hash for non-crypto environments
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash:${Math.abs(hash).toString(16).slice(0, 8)}`;
}

class ExecutionTracer {
  private traces: ExecutionTraceRecord[] = [];
  private readonly MAX_TRACES = 50;

  /**
   * Record a completed execution trace.
   */
  public recordTrace(record: ExecutionTraceRecord): void {
    this.traces.unshift(record);
    if (this.traces.length > this.MAX_TRACES) {
      this.traces.pop();
    }

    if (
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
      (typeof window !== 'undefined' && (window as any).__PH_DEBUG_TRACE__)
    ) {
      console.log(
        `[BYOK Trace] [${record.requestId}] Provider: ${record.provider} | Model: ${record.requestedModelId} -> ${record.resolvedModelId} | Status: ${record.status} (${record.responseStatus || 'N/A'}) | Latency: ${record.durationMs}ms | KeyFingerprint: ${record.keyFingerprint}`
      );
      if (record.payloadFieldsRemoved.length > 0) {
        console.log(`[BYOK Trace] Filtered incompatible fields: [${record.payloadFieldsRemoved.join(', ')}]`);
      }
    }
  }

  /**
   * Get recent traces for diagnostic display in development.
   */
  public getRecentTraces(): ExecutionTraceRecord[] {
    return [...this.traces];
  }

  /**
   * Clear in-memory trace history.
   */
  public clearTraces(): void {
    this.traces = [];
  }
}

export const executionTracer = new ExecutionTracer();
