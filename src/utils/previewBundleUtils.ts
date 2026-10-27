/**
 * Utility for compressing, encoding, and resolving live preview bundles
 * for universal Figma-like shareable links across all browsers, incognito, and mobile.
 */

/**
 * Encodes an HTML bundle string into a URL-safe Base64 hash parameter.
 */
export function encodeBundleToHash(html: string): string {
  if (!html || typeof html !== 'string') return '';
  try {
    const bytes = new TextEncoder().encode(html);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // URL-safe base64: replace + with -, / with _, and trim padding =
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    try {
      return encodeURIComponent(html);
    } catch {
      return '';
    }
  }
}

/**
 * Decodes a URL-safe Base64 hash parameter back into an HTML bundle string.
 */
export function decodeBundleFromHash(encoded: string): string {
  if (!encoded || typeof encoded !== 'string') return '';
  try {
    // Restore standard base64 from URL-safe format
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return '';
    }
  }
}

/**
 * Ensures that any code snippet (HTML, TSX, JSX, or script) is compiled into a
 * complete, self-contained, and runnable HTML document with React 18, Babel,
 * Tailwind CSS, and Lucide icons.
 */
export function ensureRunnableHtmlPayload(rawContent: string, title?: string): string {
  if (!rawContent || typeof rawContent !== 'string') return '';
  const trimmed = rawContent.trim();

  // If already a complete HTML document
  if (trimmed.includes('<!DOCTYPE html>') || trimmed.includes('<html')) {
    let html = trimmed;
    if (!html.includes('cdn.tailwindcss.com') && !html.includes('tailwind')) {
      if (/<head[\s>]/i.test(html)) {
        html = html.replace(/<head[\s>]/i, '<head><script src="https://cdn.tailwindcss.com"></script>');
      } else {
        html = `<script src="https://cdn.tailwindcss.com"></script>` + html;
      }
    }
    // Strip CORS-blocking attributes in sandboxed iframes
    html = html.replace(/\scrossorigin(?:="[^"]*")?/gi, '');
    return html;
  }

  // Extract from markdown code fences if present
  let cleanCode = trimmed;
  const fenceMatch = trimmed.match(/```(?:tsx|typescript|jsx|javascript|html)?\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) {
    cleanCode = fenceMatch[1].trim();
  }

  if (cleanCode.includes('<!DOCTYPE html>') || cleanCode.includes('<html')) {
    return cleanCode;
  }

  // Identify component name
  let componentName = 'App';
  const defaultFuncMatch = cleanCode.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  const defaultNamedMatch = cleanCode.match(/export\s+default\s+([A-Za-z0-9_]+)/);
  const anyCompMatch = cleanCode.match(/(?:function|const)\s+([A-Z]\w+)/);

  if (defaultFuncMatch && defaultFuncMatch[1]) {
    componentName = defaultFuncMatch[1];
  } else if (defaultNamedMatch && defaultNamedMatch[1] && defaultNamedMatch[1] !== 'function') {
    componentName = defaultNamedMatch[1];
  } else if (anyCompMatch && anyCompMatch[1]) {
    componentName = anyCompMatch[1];
  }

  // Clean imports and exports for Babel standalone browser evaluation
  const runnableReact = cleanCode
    .replace(/import\s+(?:type\s+)?[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
    .replace(/import\s*['"][^'"]+['"];?/g, '')
    .replace(/^\s*export\s+default\s+function\s+([A-Za-z0-9_]+)/gm, 'function $1')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+/gm, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'PromptHub Live Preview'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.4/babel.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; font-family: Outfit, system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen">
  <div id="root"></div>
  <script type="text/babel">
    ${runnableReact}
    const mountEl = document.getElementById('root');
    if (mountEl) {
      const Comp = typeof ${componentName} !== 'undefined' ? ${componentName} : (typeof App !== 'undefined' ? App : () => <div className="p-8 text-center text-sm font-sans">Module Loaded</div>);
      ReactDOM.createRoot(mountEl).render(<Comp />);
    }
  </script>
  <script>
    if (window.lucide) { lucide.createIcons(); }
  </script>
</body>
</html>`;
}

/**
 * Constructs a universal, self-contained shareable live preview URL.
 * Automatically bundles the HTML payload into the hash if within safe URL length limits.
 */
export function createShareablePreviewUrl(slug: string, htmlContent?: string, origin?: string): string {
  const baseOrigin = origin || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://prompthub.cloud');
  const cleanSlug = (slug || 'preview')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'preview';

  const baseUrl = `${baseOrigin}/preview?id=${cleanSlug}`;

  if (htmlContent && typeof htmlContent === 'string' && htmlContent.trim().length > 0) {
    const runnable = ensureRunnableHtmlPayload(htmlContent, cleanSlug);
    // Only embed in hash if bundle size is reasonable (< 90KB) for all modern browsers
    if (runnable.length < 90000) {
      const hash = encodeBundleToHash(runnable);
      if (hash) {
        return `${baseUrl}#bundle=${hash}`;
      }
    }
  }

  return baseUrl;
}
