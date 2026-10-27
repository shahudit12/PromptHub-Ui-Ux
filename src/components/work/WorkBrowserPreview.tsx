import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Globe, 
  RotateCw, 
  Monitor, 
  Tablet,
  Smartphone, 
  Code, 
  Maximize2, 
  Minimize2,
  Share2,
  ExternalLink,
  Check,
} from 'lucide-react';
import type { WorkFile } from '../../types/work';
import { createShareablePreviewUrl } from '../../utils/previewBundleUtils';

interface WorkBrowserPreviewProps {
  files: WorkFile[];
  initialRoute?: string;
  onMinimize?: () => void;
  projectName?: string;
  onSurgicalTweak?: (instruction: string) => void;
  onSyncToDrive?: () => void;
  onExportZip?: () => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const WorkBrowserPreview: React.FC<WorkBrowserPreviewProps> = ({
  files,
  initialRoute = '/',
  onMinimize: _onMinimize,
  projectName: _projectName = 'project-bundle',
  onSurgicalTweak: _onSurgicalTweak,
  onSyncToDrive: _onSyncToDrive,
  onExportZip: _onExportZip,
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [route] = useState(initialRoute);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewSource, setViewSource] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 350);
  };

  const getContainerWidth = () => {
    switch (device) {
      case 'mobile':
        return 'w-full max-w-[390px] h-full max-h-[85vh] self-center';
      case 'tablet':
        return 'w-full max-w-[768px] h-full max-h-[90vh] self-center';
      case 'desktop':
      default:
        return 'w-full h-full';
    }
  };

  // Helper to strictly filter runnable code files (React, TypeScript, JavaScript, HTML)
  const isCodeFile = (f: WorkFile | undefined | null): boolean => {
    if (!f) return false;
    if (f.isDirectory) return false;
    if (f.mimeType && f.mimeType.startsWith('image/')) return false;
    const ext = f.path.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff', 'avif'].includes(ext || '')) {
      return false;
    }
    if (['md', 'json', 'txt', 'yml', 'yaml', 'lock', 'env', 'log'].includes(ext || '')) {
      return false;
    }
    const trimmed = (f.content || '').trim();
    if (
      (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) &&
      !trimmed.includes('import ') &&
      !trimmed.includes('export ') &&
      !trimmed.includes('function ') &&
      !trimmed.includes('const ') &&
      !trimmed.includes('<html')
    ) {
      return false;
    }
    return ext === 'tsx' || ext === 'jsx' || ext === 'html' || ext === 'js' || ext === 'ts';
  };

  // Find relevant target code files only
  const codeFiles = useMemo(() => files.filter(isCodeFile), [files]);
  const appFile = codeFiles.find((f) => f.path === 'src/App.tsx' || f.path === 'src/App.jsx');

  const targetComponent = useMemo(() => {
    const routeTrim = route.replace(/^\//, '').toLowerCase();
    if (routeTrim) {
      const match = codeFiles.find((f) => f.path.toLowerCase().includes(routeTrim));
      if (match) return match;
    }

    // Root route: prioritize index.html if present, then App component
    if (!routeTrim) {
      const indexHtml = codeFiles.find((f) => f.path === 'index.html' || f.path === 'public/index.html');
      if (indexHtml) return indexHtml;
      if (appFile) return appFile;
    }

    // Check if there is an index.html file
    const indexHtml = codeFiles.find((f) => f.path === 'index.html' || f.path === 'public/index.html');
    if (indexHtml && (!routeTrim || routeTrim === 'index.html')) {
      return indexHtml;
    }
    // Return latest created component in src/components, src/pages, src/views, or src
    const components = codeFiles.filter(
      (f) =>
        (f.path.startsWith('src/components/') ||
          f.path.startsWith('src/pages/') ||
          f.path.startsWith('src/views/') ||
          f.path.startsWith('src/')) &&
        (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) &&
        f.path !== 'src/main.tsx'
    );
    const nonAppComponents = components.filter((f) => f.path !== 'src/App.tsx' && f.path !== 'src/App.jsx');
    return indexHtml || appFile || nonAppComponents[nonAppComponents.length - 1] || codeFiles[0] || null;
  }, [codeFiles, route, appFile]);

  // Construct isolated HTML preview payload
  const previewHtml = useMemo(() => {
    if (!targetComponent || !isCodeFile(targetComponent)) {
      const docFile = files.find((f) => f.path.endsWith('.md') || f.path.endsWith('.txt')) || files[0];
      if (docFile && docFile.content && docFile.content.trim().length > 0) {
        const escapedDoc = docFile.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PromptHub Specification Preview</title>
  <script crossorigin="anonymous" src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; font-family: Outfit, system-ui, -apple-system, sans-serif; }
    pre, code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#1F2A34] text-[#F8FBFE] min-h-screen p-6 md:p-8 flex flex-col items-center">
  <div class="max-w-2xl w-full space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-slate-700/60">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
        <span class="text-xs font-mono font-bold text-sky-400">${docFile.name}</span>
      </div>
      <span class="text-[11px] font-mono text-slate-400">Specifications &amp; Prompts</span>
    </div>
    <div class="p-5 rounded-xl bg-slate-900/80 border border-slate-700/70 shadow-lg">
      <pre class="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-mono">${escapedDoc}</pre>
    </div>
  </div>
</body>
</html>`;
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PromptHub Studio Preview</title>
  <script crossorigin="anonymous" src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; font-family: Outfit, system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-[#1F2A34] text-[#F8FBFE] min-h-screen flex items-center justify-center p-6">
  <div class="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
    <div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center font-mono font-bold text-lg">
      &lt;/&gt;
    </div>
    <div class="space-y-1.5">
      <h3 class="text-base font-bold text-white tracking-tight">Code Preview Only</h3>
      <p class="text-xs text-slate-400 leading-relaxed">
        Live browser sandbox strictly executes TypeScript, React, and HTML code. Describe your product in chat to generate interactive source code and preview it live.
      </p>
    </div>
  </div>
</body>
</html>`;
    }

    // Direct HTML file rendering (e.g. index.html or website clones)
    if (targetComponent.path.endsWith('.html')) {
      let htmlContent = targetComponent.content || '';
      // Ensure Tailwind CSS is included if not already present, without CORS-blocking crossorigin
      if (!htmlContent.includes('cdn.tailwindcss.com') && !htmlContent.includes('tailwind')) {
        if (/<head[\s>]/i.test(htmlContent)) {
          htmlContent = htmlContent.replace(/<head[\s>]/i, '<head><script src="https://cdn.tailwindcss.com"></script>');
        } else {
          htmlContent = `<script src="https://cdn.tailwindcss.com"></script>` + htmlContent;
        }
      }
      // Strip any problematic crossorigin attributes that trigger CORS blocking on sandboxed Origin: null
      htmlContent = htmlContent.replace(/\scrossorigin(?:="[^"]*")?/gi, '');
      return htmlContent;
    }

    let componentCode = targetComponent?.content || '';
    // Defensively extract inner code block if file contains markdown code fences or conversational preamble
    const fenceMatch = componentCode.match(/```(?:tsx|typescript|jsx|javascript|html)?\s*([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) {
      componentCode = fenceMatch[1].trim();
    }

    // Extract all named imports from lucide-react or other icon libraries
    const importedIdentifiers: string[] = [];
    const impRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
    let impMatch: RegExpExecArray | null;
    while ((impMatch = impRegex.exec(componentCode)) !== null) {
      const parts = impMatch[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      importedIdentifiers.push(...parts);
    }
    // Extract all uppercase JSX tags (e.g. <Users, <Sparkles, <Terminal, <Cpu, etc.)
    const jsxTagMatches = Array.from(componentCode.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)).map((m) => m[1]);
    const mockNames = Array.from(new Set([...importedIdentifiers, ...jsxTagMatches])).filter(
      (n) => n !== 'App' && !['React', 'Fragment', 'Suspense', 'StrictMode'].includes(n)
    );

    // Strip ES module import statements and normalize exports for Babel standalone in browser
    let cleanCode = componentCode
      .replace(/import\s+(?:type\s+)?[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
      .replace(/import\s*['"][^'"]+['"];?/g, '')
      .replace(/^\s*export\s+default\s+function\s+([A-Za-z0-9_]+)/gm, 'function $1')
      .replace(/^\s*export\s+default\s+/gm, '')
      .replace(/^\s*export\s+/gm, '');

    // Identify component name
    let componentName = 'App';
    const defaultFuncMatch = componentCode.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
    const defaultNamedMatch = componentCode.match(/export\s+default\s+([A-Za-z0-9_]+)/);
    const anyCompMatch = cleanCode.match(/(?:function|const)\s+([A-Z]\w+)/);

    if (defaultFuncMatch && defaultFuncMatch[1]) {
      componentName = defaultFuncMatch[1];
    } else if (defaultNamedMatch && defaultNamedMatch[1] && defaultNamedMatch[1] !== 'function') {
      componentName = defaultNamedMatch[1];
    } else if (anyCompMatch && anyCompMatch[1]) {
      componentName = anyCompMatch[1];
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PromptHub Work Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.4/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: Outfit, system-ui, -apple-system, sans-serif; }
    .animate-spin-slow { animation: spin 8s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      var root = document.getElementById('root');
      var rawMsg = String((error && error.message) || message || error || 'Script runtime notice');
      if (rawMsg === 'Script error.' || rawMsg.indexOf('Script error') !== -1) {
        rawMsg = 'Sandbox compiler loading dependencies. Transpiling and mounting component...';
      }
      if (root && !root.innerHTML.includes('Preview Runtime Notice')) {
        root.innerHTML = '<div class="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 rounded-xl m-4 font-mono text-xs shadow-sm">' +
          '<h3 class="text-sm font-bold m-0 mb-2 text-amber-700 dark:text-amber-400">Sandbox Preview Notice</h3>' +
          '<p class="m-0 mb-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">' + rawMsg + '</p>' +
          '<div class="text-[11px] text-amber-600 dark:text-amber-400">Component: ' + ${JSON.stringify(targetComponent?.path || 'workspace')} + '</div>' +
        '</div>';
      }
      return true;
    };
  </script>
</head>
<body class="bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen">
  <div id="root">
    <div class="p-8 text-center text-stone-500 font-sans">
      <div class="animate-pulse flex items-center justify-center gap-2">
        <svg class="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <span>Compiling workspace preview...</span>
      </div>
    </div>
  </div>

  <script>
    // Comprehensive Lucide mock icon provider
    function createMockIcon(label, symbol) {
      return function MockIcon(props) {
        var cls = "inline-flex items-center justify-center font-bold text-xs select-none " + ((props && props.className) || "");
        return React.createElement("span", Object.assign({}, props, { className: cls, title: label }), symbol || "✦");
      };
    }

    window.LucideReact = new Proxy({}, {
      get: function(target, prop) {
        if (prop in target) return target[prop];
        return createMockIcon(String(prop), "✦");
      }
    });
    window.lucide = window.LucideReact;
    window.lucideReact = window.LucideReact;

    window.addEventListener('DOMContentLoaded', function() {
      var root = document.getElementById('root');
      try {
        if (typeof Babel === 'undefined' || typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
          throw new Error('Sandbox compiler is loading dependencies. Please refresh preview in a moment.');
        }

        var codeToTransform = ${JSON.stringify(cleanCode)};
        var targetCompName = ${JSON.stringify(componentName)};
        var mockNamesList = ${JSON.stringify(mockNames)};

        var transformed = Babel.transform(codeToTransform, {
          presets: [
            ['react', { runtime: 'classic' }],
            ['typescript', { isTSX: true, allExtensions: true }]
          ],
          filename: 'preview.tsx'
        }).code;

        // Auto-declare all imported icon names and uppercase JSX tags to prevent ReferenceError
        var iconDeclarations = mockNamesList.map(function(n) {
          return 'var ' + n + ' = (window.LucideReact && window.LucideReact["' + n + '"]) || createMockIcon("' + n + '", "✦");';
        }).join('\\n');

        // Provide React hooks and libraries to component scope
        var evalScope = new Function(
          'React',
          'ReactDOM',
          'useState',
          'useEffect',
          'useRef',
          'useMemo',
          'useCallback',
          'useContext',
          'useReducer',
          'useId',
          'useTransition',
          'useDeferredValue',
          'useLayoutEffect',
          'useImperativeHandle',
          'LucideReact',
          'createMockIcon',
          iconDeclarations + '\\n' +
          'var motion = new Proxy({}, { get: function(_, tag) { return function MotionTag(props) { var p = Object.assign({}, props); delete p.initial; delete p.animate; delete p.exit; delete p.transition; delete p.whileHover; delete p.whileTap; return React.createElement(tag, p); }; } });\\n' +
          'var AnimatePresence = function(props) { return props && props.children; };\\n' +
          'var Link = function(props) { return React.createElement("a", Object.assign({}, props, { href: props.to || "#" }), props.children); };\\n' +
          transformed + '\\n' +
          'return (typeof ' + targetCompName + ' !== "undefined" ? ' + targetCompName + ' : (typeof App !== "undefined" ? App : null));'
        );

        var ComponentToRender = evalScope(
          React,
          ReactDOM,
          React.useState,
          React.useEffect,
          React.useRef,
          React.useMemo,
          React.useCallback,
          React.useContext,
          React.useReducer,
          React.useId || function() { return Math.random().toString(36).slice(2); },
          React.useTransition || function() { return [false, function(cb) { cb(); }]; },
          React.useDeferredValue || function(v) { return v; },
          React.useLayoutEffect || React.useEffect,
          React.useImperativeHandle || function() {},
          window.LucideReact,
          createMockIcon
        );

        if (!ComponentToRender) {
          ComponentToRender = function FallbackComp() {
            return React.createElement('div', { className: 'p-8 text-center text-stone-600 font-sans' },
              React.createElement('h2', { className: 'text-lg font-bold text-emerald-800' }, 'PromptHub Work Studio'),
              React.createElement('p', { className: 'mt-1 text-xs text-stone-500' }, 'Module transpiled successfully.')
            );
          };
        }

        // Error boundary to prevent any render crashes from bubbling as "Script error."
        class PreviewErrorBoundary extends React.Component {
          constructor(props) {
            super(props);
            this.state = { hasError: false, error: null };
          }
          static getDerivedStateFromError(error) {
            return { hasError: true, error: error };
          }
          componentDidCatch(error, info) {
            console.warn('Component render caught:', error, info);
          }
          render() {
            if (this.state.hasError) {
              return React.createElement('div', {
                className: 'p-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 rounded-xl m-4 font-mono text-xs shadow-sm'
              },
                React.createElement('h3', { className: 'text-sm font-bold m-0 mb-2 text-red-700 dark:text-red-400' }, 'Preview Runtime Notice'),
                React.createElement('pre', { className: 'm-0 mb-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed' }, String(this.state.error && (this.state.error.message || this.state.error))),
                React.createElement('div', { className: 'text-[11px] text-red-600 dark:text-red-400' }, 'Target Component: ' + targetCompName)
              );
            }
            return this.props.children;
          }
        }

        if (ReactDOM.createRoot) {
          ReactDOM.createRoot(root).render(
            React.createElement(PreviewErrorBoundary, null, React.createElement(ComponentToRender))
          );
        } else {
          ReactDOM.render(
            React.createElement(PreviewErrorBoundary, null, React.createElement(ComponentToRender)),
            root
          );
        }
      } catch (err) {
        if (root) {
          root.innerHTML = '<div class="p-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 rounded-xl m-4 font-mono text-xs shadow-sm">' +
            '<h3 class="text-sm font-bold m-0 mb-2 text-red-700 dark:text-red-400 flex items-center gap-1.5"><span>⚠️</span> Preview Compilation Notice</h3>' +
            '<pre class="m-0 mb-2 whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-auto leading-relaxed">' + (err.message || String(err)) + '</pre>' +
            '<div class="text-[11px] text-red-600 dark:text-red-400 font-mono">Target: ' + ${JSON.stringify(targetComponent?.path || 'workspace')} + '</div>' +
          '</div>';
        }
      }
    });
  </script>
</body>
</html>`;
  }, [targetComponent, route, refreshKey]);

  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMaximized]);

  const cleanSlug = useMemo(() => {
    return (_projectName || 'preview')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'preview';
  }, [_projectName]);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (previewHtml) {
      try {
        localStorage.setItem(`ph_live_site_${cleanSlug}`, previewHtml);
        localStorage.setItem('ph_workspace_latest_html', previewHtml);
      } catch {}
    }
  }, [previewHtml, cleanSlug]);

  const handleOpenNewTab = () => {
    if (previewHtml) {
      try {
        localStorage.setItem(`ph_live_site_${cleanSlug}`, previewHtml);
        localStorage.setItem('ph_workspace_latest_html', previewHtml);
      } catch {}
    }
    const targetUrl = createShareablePreviewUrl(cleanSlug, previewHtml || undefined);
    window.open(targetUrl, '_blank');
  };

  const handleShareLink = async () => {
    if (previewHtml) {
      try {
        localStorage.setItem(`ph_live_site_${cleanSlug}`, previewHtml);
        localStorage.setItem('ph_workspace_latest_html', previewHtml);
      } catch {}
    }
    const url = createShareablePreviewUrl(cleanSlug, previewHtml || undefined);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const previewContent = (
    <div
      className={`bg-bg-secondary border border-border-default flex flex-col ${
        isMaximized
          ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none'
          : 'rounded-xl h-full'
      } overflow-hidden shadow-2xs font-sans`}
    >
      {/* Browser Bar - Responsive, Sleek & Focused */}
      <div className="bg-bg-tertiary/70 border-b border-border-subtle px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 select-none min-w-0">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-text-primary hidden sm:inline font-display">
              Live Preview
            </span>
          </div>
          {targetComponent && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 truncate max-w-[120px] font-semibold">
              {targetComponent.name}
            </span>
          )}
        </div>

        {/* Center: Device Switcher (Desktop vs Mobile Preview) */}
        <div className="flex items-center bg-bg-secondary rounded-lg p-0.5 border border-border-default shadow-3xs">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            title="Desktop View (100%)"
            aria-label="Desktop View"
            className={`h-6 px-2 min-h-[24px] flex items-center gap-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              device === 'desktop'
                ? 'bg-brand-primary text-white font-semibold shadow-3xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            title="Tablet Screen View (768px)"
            aria-label="Tablet View"
            className={`h-6 px-2 min-h-[24px] flex items-center gap-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              device === 'tablet'
                ? 'bg-brand-primary text-white font-semibold shadow-3xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Tablet className="w-3 h-3" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            title="Mobile Screen View (390px)"
            aria-label="Mobile View"
            className={`h-6 px-2 min-h-[24px] flex items-center gap-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              device === 'mobile'
                ? 'bg-brand-primary text-white font-semibold shadow-3xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Dedicated Tab, Share, Refresh, View Code, and Fullscreen */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleOpenNewTab}
            title="Open Live Preview in Dedicated Tab"
            aria-label="Open in Dedicated Tab"
            className="h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border border-border-default hover:bg-bg-secondary text-text-secondary hover:text-brand-primary transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            title={copiedLink ? 'Link Copied!' : 'Share Live Preview Link'}
            aria-label="Share Live Preview Link"
            className="h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border border-border-default hover:bg-bg-secondary text-text-secondary hover:text-brand-primary transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-brand-primary" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            title="Reload Preview"
            aria-label="Reload Preview"
            className="h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border border-border-default hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setViewSource(!viewSource)}
            title={viewSource ? 'Show Rendered View' : 'Show Source Code'}
            aria-label={viewSource ? 'Show Rendered View' : 'Show Source Code'}
            className={`h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border border-border-default hover:bg-bg-secondary transition-colors cursor-pointer ${
              viewSource ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Preview' : 'Maximize Preview to Fullscreen'}
            aria-label={isMaximized ? 'Restore Preview' : 'Maximize Preview to Fullscreen'}
            className="h-7 w-7 min-h-[28px] min-w-[28px] rounded-lg border border-border-default hover:bg-bg-secondary flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 text-brand-primary" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Browser Viewport Container */}
      <div className="flex-1 bg-stone-100 dark:bg-stone-900/60 p-1.5 sm:p-3 overflow-hidden flex items-center justify-center min-h-0">
        {viewSource ? (
          <div className="w-full h-full bg-bg-primary border border-border-default rounded-lg p-3 sm:p-4 font-mono text-xs overflow-auto text-text-primary">
            <div className="text-[11px] text-text-muted mb-2 font-semibold">
              Source: {targetComponent?.path || 'None'}
            </div>
            <pre className="whitespace-pre-wrap">{targetComponent?.content || '// No content'}</pre>
          </div>
        ) : (
          <div
            className={`${getContainerWidth()} h-full bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-all duration-200 flex flex-col`}
          >
            {targetComponent ? (
              <iframe
                key={`${targetComponent.path}_${refreshKey}`}
                srcDoc={previewHtml}
                title="Work App Live Preview"
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full flex-1 border-0"
              />
            ) : (
              <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center m-auto max-w-sm">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-3 shadow-3xs">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-text-primary mb-1 font-display">
                  Live Sandbox Preview
                </h4>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Your live web application, code editor, and single-folder deliverables will render here automatically as you create.
                </p>
                <div className="text-[11px] font-mono px-3 py-1 rounded-full bg-bg-secondary border border-border-default text-text-secondary">
                  Ready • Instant Re-render • Multi-Device
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isMaximized && typeof document !== 'undefined') {
    return createPortal(previewContent, document.body);
  }

  return previewContent;
};
