/**
 * src/utils/promptMediaAttachment.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal Prompt Image Attachment, Drag-and-Drop & Clipboard Paste Engine.
 *
 * Provides resilient client-side image processing, magic-bytes validation,
 * canvas compression, multi-tier storage uploads, and drag/drop/paste helpers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { cloudinaryService } from '../services/cloudinaryService';
import { securityUtils } from './security';

export interface PromptImageUploadOptions {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  folder?: 'prompts' | 'covers' | 'avatars';
}

const inFlightPromptMedia = new Map<string, Promise<{ url: string; markdownTag: string }>>();

/**
 * Validates, compresses, and uploads a single image file for prompt context.
 * Returns the markdown tag `![Image Context](<url>)` ready for prompt insertion.
 * Idempotent: reuses active in-flight uploads for the same file to prevent duplicates.
 */
export async function uploadPromptImage(
  file: File,
  options?: PromptImageUploadOptions
): Promise<{ url: string; markdownTag: string }> {
  const inFlightKey = `${(file.name || 'untitled').toLowerCase().trim()}::${file.size}`;
  if (inFlightPromptMedia.has(inFlightKey)) {
    return inFlightPromptMedia.get(inFlightKey)!;
  }

  const uploadPromise = (async () => {
    const showToast = options?.showToast || (() => {});
    const folder = options?.folder || 'prompts';

    // 1. Client-side rate limit
    const rateCheck = securityUtils.rateLimit('prompt_media_upload', 1200);
    if (!rateCheck.allowed) {
      const errorMsg = rateCheck.error || 'Please wait a moment before uploading another image.';
      showToast(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    showToast('Processing and optimizing photo...', 'info');

    // 2. Validate file size (max 10MB) and magic bytes
    const validation = await cloudinaryService.validateFile(file, 10);
    if (!validation.isValid) {
      const errorMsg = validation.error || 'Invalid or unsupported image file format.';
      showToast(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    // 3. Client-side canvas compression for instant responsiveness
    const compressed = await cloudinaryService.compressImage(file, 1200, 1200, 0.85);

    // 4. Multi-tier upload pipeline (Cloudinary -> Supabase Storage -> Data URI)
    const res = await cloudinaryService.uploadImage(compressed, folder);
    const secureUrl = res.secure_url;
    const markdownTag = `\n\n![Image Context](${secureUrl})\n`;

    showToast('📸 Photo attached to prompt!', 'success');
    return { url: secureUrl, markdownTag };
  })();

  inFlightPromptMedia.set(inFlightKey, uploadPromise);
  try {
    return await uploadPromise;
  } finally {
    inFlightPromptMedia.delete(inFlightKey);
  }
}

/**
 * Helper to append image markdown to prompt content cleanly.
 */
export function appendImageToPrompt(currentPrompt: string, imageUrl: string): string {
  const markdownTag = `\n\n![Image Context](${imageUrl})\n`;
  return currentPrompt.trim() ? `${currentPrompt.trim()}${markdownTag}` : `![Image Context](${imageUrl})\n`;
}
