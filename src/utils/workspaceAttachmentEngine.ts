/**
 * src/utils/workspaceAttachmentEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Multimodal Attachment Ingestion Pipeline for PromptHub Workspace.
 *
 * Implements:
 * 1. Strict validation (10MB limit, allowed extensions/MIMEs, magic bytes verification).
 * 2. Client-side processing:
 *    - Images: Canvas downscale (max dimension 1600px), preview object URL, base64 data.
 *    - CSV: Client-side parsing into structured headers, rows, and formatted Markdown table.
 *    - JSON: Parsing, schema key summary, and formatted 2-space indented string.
 *    - Text / Markdown: UTF-8 stream reading with safe context window budgeting.
 *    - PDF: Base64 inline payload generation for Gemini/Vision + text chunk extraction.
 * 3. Clean prompt context injection formatting.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const MAX_IMAGE_DIMENSION = 1600; // 1600px max dimension
export const MAX_CSV_ROWS_PREVIEW = 60; // Max CSV preview rows
export const MAX_TEXT_CHARS = 25000; // 25,000 char budget for text/md
export const MAX_JSON_CHARS = 15000; // 15,000 char budget for JSON

export type AttachmentKind = 'image' | 'document' | 'data';

export interface WorkspaceAttachment {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  kind: AttachmentKind;
  mimeType: string;
  previewUrl?: string; // Object URL for image thumbnail preview
  base64Data?: string; // Pure base64 data (without data URL scheme) for vision models
  extractedContent?: string; // Structured Markdown table / text for prompt context injection
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  metadata?: {
    dimensions?: { width: number; height: number };
    rowCount?: number;
    columnCount?: number;
    truncated?: boolean;
    schemaKeys?: string[];
  };
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
}

export const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.pdf',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
]);

export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'application/csv',
  'text/x-csv',
  'application/json',
  'text/json',
]);

/**
 * Format raw byte size into human-readable label.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract lowercased file extension including leading dot.
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validate attachment against:
 * 1. 10MB maximum file size limit
 * 2. Allowed file extension (.png, .jpg, .jpeg, .webp, .pdf, .txt, .md, .csv, .json)
 * 3. Allowed MIME type (if provided by browser)
 * 4. Header magic bytes inspection (prevents masquerading executables and corrupted files)
 */
export async function validateAttachment(file: File): Promise<AttachmentValidationResult> {
  // 1. File size check
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" exceeds the 10MB limit (${sizeMB} MB). Please select a file under 10MB.`,
    };
  }

  // 2. Extension check
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported file format (${ext || 'unknown'}). Supported formats are Images (PNG, JPG, WEBP), Documents (PDF, TXT, MD), and Data files (CSV, JSON).`,
    };
  }

  // 3. MIME type check (if browser populated a non-empty, non-generic MIME type)
  if (file.type && file.type !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type}). Supported formats are Images (PNG, JPG, WEBP), Documents (PDF, TXT, MD), and Data files (CSV, JSON).`,
    };
  }

  // 4. Magic Bytes Inspection
  try {
    const headerBuffer = await file.slice(0, 512).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    if (bytes.length < 3 && file.size > 0 && ext !== '.txt' && ext !== '.md') {
      return {
        valid: false,
        error: `File "${file.name}" appears empty or truncated.`,
      };
    }

    // Check for common malicious/binary headers disguised as text/data
    // Windows PE Executable: "MZ" (0x4D, 0x5A)
    if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      return {
        valid: false,
        error: `Executable binaries are not permitted ("${file.name}").`,
      };
    }
    // Linux ELF: 0x7F, 0x45, 0x4C, 0x46 ("\x7FELF")
    if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      return {
        valid: false,
        error: `Executable binaries are not permitted ("${file.name}").`,
      };
    }

    // PNG check: 89 50 4E 47
    if (ext === '.png') {
      const isPng = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      if (!isPng) {
        return {
          valid: false,
          error: `File content does not match PNG format for "${file.name}".`,
        };
      }
    }

    // JPEG check: FF D8 FF
    if (ext === '.jpg' || ext === '.jpeg') {
      const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!isJpeg) {
        return {
          valid: false,
          error: `File content does not match JPEG format for "${file.name}".`,
        };
      }
    }

    // WebP check: "RIFF" .... "WEBP"
    if (ext === '.webp') {
      const isRiff = bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50; // WEBP
      if (!isRiff) {
        return {
          valid: false,
          error: `File content does not match WebP format for "${file.name}".`,
        };
      }
    }

    // PDF check: "%PDF" (25 50 44 46)
    if (ext === '.pdf') {
      const isPdf = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      if (!isPdf) {
        return {
          valid: false,
          error: `File content does not match PDF format for "${file.name}".`,
        };
      }
    }

    // Text / CSV / JSON checks: ensure no binary null bytes in header
    if (ext === '.txt' || ext === '.md' || ext === '.markdown' || ext === '.csv' || ext === '.json') {
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0x00) {
          return {
            valid: false,
            error: `File "${file.name}" contains binary characters and cannot be read as text or data.`,
          };
        }
      }
    }
  } catch {
    // If arrayBuffer reading fails, return generic rejection
    return {
      valid: false,
      error: `Could not inspect file contents for "${file.name}".`,
    };
  }

  return { valid: true };
}

/**
 * Throw error if attachment is invalid.
 */
export async function assertValidAttachment(file: File): Promise<void> {
  const result = await validateAttachment(file);
  if (!result.valid) {
    throw new Error(result.error || `Attachment "${file.name}" failed validation.`);
  }
}

/**
 * Convert an ArrayBuffer or Uint8Array to base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const maybeBuffer = (globalThis as unknown as { Buffer?: { from: (b: Uint8Array) => { toString: (enc: string) => string } } }).Buffer;
  if (typeof maybeBuffer !== 'undefined') {
    return maybeBuffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Safely parse a single CSV line into trimmed columns, respecting quoted strings.
 */
export function parseCsvLine(line: string): string[] {
  const row: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  return row;
}

/**
 * Client-side image resize via HTML5 Canvas.
 * Downscales images proportionally so that max(width, height) <= maxDimension (1600px).
 */
async function resizeImageClientSide(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION
): Promise<{ base64Data: string; mimeType: string; dimensions: { width: number; height: number }; previewUrl: string }> {
  const previewUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '';

  // Check if running in browser with Image & Canvas support
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Image !== 'undefined') {
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image into DOM'));
        img.src = previewUrl;
      });

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(targetMime, 0.85);
        const base64Data = dataUrl.split(',')[1] || '';
        return {
          base64Data,
          mimeType: targetMime,
          dimensions: { width, height },
          previewUrl,
        };
      }
    } catch {
      // Fall through to raw buffer conversion if canvas fails
    }
  }

  // Fallback: read directly as array buffer and encode to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = bufferToBase64(arrayBuffer);
  return {
    base64Data,
    mimeType: file.type || 'image/png',
    dimensions: { width: 0, height: 0 },
    previewUrl,
  };
}

/**
 * Extract text chunks from PDF byte stream.
 */
function extractPdfTextChunks(bytes: Uint8Array): string {
  try {
    let raw = '';
    const len = Math.min(bytes.length, 250000); // scan first 250KB for text tokens
    for (let i = 0; i < len; i++) {
      const b = bytes[i];
      // Keep printable ASCII and whitespace
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        raw += String.fromCharCode(b);
      } else {
        raw += ' ';
      }
    }

    // Extract strings inside parentheses (standard PDF string literal: (Hello World) Tj)
    const matches = raw.match(/\(([^()]{3,150})\)\s*(?:Tj|TJ|\')/g);
    if (matches && matches.length > 0) {
      const cleanChunks = matches
        .map(m => m.replace(/^\(|\)\s*(?:Tj|TJ|\')$/g, '').trim())
        .filter(t => t.length > 2 && !/^[0-9\s.]+$/.test(t) && !/^[/\\_%]/.test(t));

      if (cleanChunks.length > 0) {
        return cleanChunks.slice(0, 80).join(' ');
      }
    }
  } catch {
    // Graceful fallback
  }
  return '';
}

/**
 * Ingest and process an attachment into a ready WorkspaceAttachment object.
 */
export async function processAttachment(file: File): Promise<WorkspaceAttachment> {
  await assertValidAttachment(file);

  const ext = getFileExtension(file.name);
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const formattedSize = formatFileSize(file.size);

  // ─── 1. Images (PNG, JPG, WEBP) ──────────────────────────────────────────
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    const { base64Data, mimeType, dimensions, previewUrl } = await resizeImageClientSide(file, MAX_IMAGE_DIMENSION);

    const dimLabel = dimensions.width && dimensions.height ? `, ${dimensions.width}×${dimensions.height}` : '';
    const extractedContent = `[Attached Image: ${file.name} (${formattedSize}${dimLabel}) - Visual payload attached for Multimodal Vision models (Gemini 2.0 Flash / GPT-4o)]`;

    return {
      id,
      file,
      name: file.name,
      sizeBytes: file.size,
      formattedSize,
      kind: 'image',
      mimeType,
      previewUrl,
      base64Data,
      extractedContent,
      status: 'ready',
      metadata: {
        dimensions,
      },
    };
  }

  // ─── 2. CSV Files ────────────────────────────────────────────────────────
  if (ext === '.csv') {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        id,
        file,
        name: file.name,
        sizeBytes: file.size,
        formattedSize,
        kind: 'data',
        mimeType: 'text/csv',
        extractedContent: `[CSV Data: ${file.name} (Empty file)]`,
        status: 'ready',
        metadata: { rowCount: 0, columnCount: 0 },
      };
    }

    const headers = parseCsvLine(lines[0]);
    const rawDataRows = lines.slice(1).map(parseCsvLine);
    const totalRows = rawDataRows.length;
    const previewRows = rawDataRows.slice(0, MAX_CSV_ROWS_PREVIEW);

    // Format clean Markdown table
    let md = `[CSV Data: ${file.name} (${totalRows} rows, ${headers.length} columns)]\n\n`;
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;
    for (const row of previewRows) {
      const paddedRow = headers.map((_, i) => row[i] ?? '');
      md += `| ${paddedRow.join(' | ')} |\n`;
    }

    const isTruncated = totalRows > MAX_CSV_ROWS_PREVIEW;
    if (isTruncated) {
      md += `\n*... [Showing ${MAX_CSV_ROWS_PREVIEW} of ${totalRows} rows]*`;
    }

    return {
      id,
      file,
      name: file.name,
      sizeBytes: file.size,
      formattedSize,
      kind: 'data',
      mimeType: 'text/csv',
      extractedContent: md,
      status: 'ready',
      metadata: {
        rowCount: totalRows,
        columnCount: headers.length,
        truncated: isTruncated,
      },
    };
  }

  // ─── 3. JSON Files ───────────────────────────────────────────────────────
  if (ext === '.json') {
    const rawText = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(`"${file.name}" is not a valid JSON document.`);
    }

    let summaryHeader = '';
    let schemaKeys: string[] = [];

    if (Array.isArray(parsed)) {
      const sampleItem = parsed.find(item => item && typeof item === 'object');
      schemaKeys = sampleItem ? Object.keys(sampleItem) : [];
      summaryHeader = `[JSON Data: ${file.name} (Array with ${parsed.length} items${schemaKeys.length > 0 ? `, Keys: ${schemaKeys.slice(0, 10).join(', ')}` : ''})]`;
    } else if (parsed && typeof parsed === 'object') {
      schemaKeys = Object.keys(parsed);
      summaryHeader = `[JSON Data: ${file.name} (Object with ${schemaKeys.length} keys: ${schemaKeys.slice(0, 10).join(', ')})]`;
    } else {
      summaryHeader = `[JSON Data: ${file.name}]`;
    }

    const formattedJson = JSON.stringify(parsed, null, 2);
    const isTruncated = formattedJson.length > MAX_JSON_CHARS;
    const body = isTruncated
      ? formattedJson.slice(0, MAX_JSON_CHARS) + '\n... [Remaining JSON truncated for token length]'
      : formattedJson;

    const extractedContent = `${summaryHeader}\n\`\`\`json\n${body}\n\`\`\``;

    return {
      id,
      file,
      name: file.name,
      sizeBytes: file.size,
      formattedSize,
      kind: 'data',
      mimeType: 'application/json',
      extractedContent,
      status: 'ready',
      metadata: {
        schemaKeys,
        truncated: isTruncated,
      },
    };
  }

  // ─── 4. Plain Text & Markdown ────────────────────────────────────────────
  if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    const text = await file.text();
    const isTruncated = text.length > MAX_TEXT_CHARS;
    const body = isTruncated
      ? text.slice(0, MAX_TEXT_CHARS) + `\n... [Truncated to ${MAX_TEXT_CHARS} characters]`
      : text;

    const label = ext === '.txt' ? 'Plain Text Document' : 'Markdown Document';
    const extractedContent = `[${label}: ${file.name} (${formattedSize})]\n${body}`;

    return {
      id,
      file,
      name: file.name,
      sizeBytes: file.size,
      formattedSize,
      kind: 'document',
      mimeType: ext === '.txt' ? 'text/plain' : 'text/markdown',
      extractedContent,
      status: 'ready',
      metadata: {
        truncated: isTruncated,
      },
    };
  }

  // ─── 5. PDF Documents ────────────────────────────────────────────────────
  if (ext === '.pdf') {
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const base64Data = bufferToBase64(uint8);
    const extractedChunks = extractPdfTextChunks(uint8);

    let extractedContent: string;
    if (extractedChunks.length > 20) {
      extractedContent = `[PDF Document: ${file.name} (${formattedSize}) - Inline PDF Payload attached for Vision/Multimodal AI]\n\nExtracted Text Preview:\n${extractedChunks}`;
    } else {
      extractedContent = `[PDF Document: ${file.name} (${formattedSize}) - Native PDF Payload attached for Multimodal Vision AI (Gemini 2.0 Flash / GPT-4o)]`;
    }

    return {
      id,
      file,
      name: file.name,
      sizeBytes: file.size,
      formattedSize,
      kind: 'document',
      mimeType: 'application/pdf',
      base64Data,
      extractedContent,
      status: 'ready',
    };
  }

  // Fallback for safety
  throw new Error(`Unsupported attachment extension: ${ext}`);
}

/**
 * Format ingested attachments into a structured Markdown prompt context block.
 * Injects non-image document & data tables into prompt text so any language model
 * (even text-only) has immediate access to the attached content.
 */
export function formatContextFromAttachments(attachments: WorkspaceAttachment[]): string {
  if (!attachments || attachments.length === 0) return '';

  const readyItems = attachments.filter(a => a.status === 'ready' && a.extractedContent);
  if (readyItems.length === 0) return '';

  const blocks = readyItems.map(a => a.extractedContent?.trim()).filter(Boolean);

  return (
    '\n\n---\n### Attached Files & Ingested Context\n' +
    'The user provided the following verified files and data context for this task:\n\n' +
    blocks.join('\n\n---\n\n') +
    '\n---\n'
  );
}

/**
 * Detect whether any of the attachments are visual/image inputs requiring a vision-capable model.
 */
export function detectVisionInput(attachments: WorkspaceAttachment[]): boolean {
  if (!attachments || attachments.length === 0) return false;
  return attachments.some(a => a.kind === 'image');
}

/**
 * Clean up object URLs created during attachment processing to prevent memory leaks.
 */
export function revokeAttachmentUrl(attachment: WorkspaceAttachment): void {
  if (attachment.previewUrl && attachment.previewUrl.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

/**
 * Clean up all object URLs in an attachment array.
 */
export function revokeAllAttachmentUrls(attachments: WorkspaceAttachment[]): void {
  if (!attachments) return;
  for (const att of attachments) {
    revokeAttachmentUrl(att);
  }
}
