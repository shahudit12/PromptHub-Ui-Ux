/**
 * src/utils/clipboard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-platform clipboard copy utility with automatic fallback for
 * permission restrictions, iframe sandboxes, and non-secure origins.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface CopyResult {
  success: boolean;
  error?: string;
}

/**
 * Copies text to the user's clipboard reliably across browsers.
 * Tries the modern async Clipboard API first, falling back to execCommand.
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (!text && text !== '') {
    return { success: false, error: 'No content to copy' };
  }

  // 1. Try modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (err: any) {
      console.warn('[Clipboard] navigator.clipboard.writeText failed, attempting execCommand fallback:', err?.message);
    }
  }

  // 2. Fallback using invisible textarea + execCommand('copy')
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        return { success: true };
      }
    }
  } catch (err: any) {
    console.error('[Clipboard] Fallback execCommand failed:', err?.message);
  }

  return {
    success: false,
    error: 'Clipboard access denied by browser permissions. Please copy manually.',
  };
}
