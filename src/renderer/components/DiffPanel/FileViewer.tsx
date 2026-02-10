import React, { useEffect, useState, useMemo } from 'react';
import hljs from 'highlight.js';

interface FileViewerProps {
  filePath: string;
  projectPath: string;
  onClose: () => void;
}

const EXT_LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
  swift: 'swift', kt: 'kotlin', scala: 'scala', php: 'php',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
  html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml',
  css: 'css', scss: 'scss', less: 'less', sass: 'scss',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
  md: 'markdown', mdx: 'markdown',
  sql: 'sql', graphql: 'graphql',
  dockerfile: 'dockerfile', makefile: 'makefile',
  lua: 'lua', perl: 'perl', r: 'r', dart: 'dart',
  vue: 'xml', svelte: 'xml',
};

function getLanguage(filePath: string): string | undefined {
  const name = filePath.split('/').pop()?.toLowerCase() || '';
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';
  const ext = name.split('.').pop() || '';
  return EXT_LANG_MAP[ext];
}

export function FileViewer({ filePath, projectPath, onClose }: FileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fullPath = filePath.startsWith('/') ? filePath : `${projectPath}/${filePath}`;
  const fileName = filePath.split('/').pop() || filePath;
  const relativePath = filePath.startsWith('/') ? filePath.replace(projectPath + '/', '') : filePath;

  useEffect(() => {
    setLoading(true);
    setError(null);
    window.api.file.read(fullPath).then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setContent(result.content || '');
      }
      setLoading(false);
    });
  }, [fullPath]);

  const highlighted = useMemo(() => {
    if (!content) return null;
    const lang = getLanguage(filePath);
    try {
      if (lang) {
        return hljs.highlight(content, { language: lang }).value;
      }
      return hljs.highlightAuto(content).value;
    } catch {
      return null;
    }
  }, [content, filePath]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const lines = content?.split('\n') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg border border-border rounded-lg shadow-2xl flex flex-col"
        style={{ width: '85vw', height: '80vh', maxWidth: 1200 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-muted">
              <path d="M3 1.5h6.5L13 5v9.5a1 1 0 01-1 1H3a1 1 0 01-1-1v-13a1 1 0 011-1z"
                stroke="currentColor" strokeWidth="1.2" />
              <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="text-sm font-medium text-text-primary truncate">{fileName}</span>
            <span className="text-xs text-text-muted truncate">{relativePath}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              Loading…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              {error === 'Binary file' ? 'Binary file — cannot display' : error}
            </div>
          )}
          {!loading && !error && content !== null && (
            <div className="flex text-[13px] font-mono leading-relaxed">
              {/* Line numbers */}
              <div className="shrink-0 select-none text-right pr-3 pl-3 py-2 text-text-muted/40 bg-surface/50 border-r border-border">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <div className="flex-1 overflow-x-auto py-2 pl-4 pr-4">
                {highlighted ? (
                  <pre className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
                ) : (
                  <pre className="text-text-primary whitespace-pre">{content}</pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border text-[11px] text-text-muted bg-surface rounded-b-lg">
          <span>{lines.length} lines</span>
          <span>{getLanguage(filePath) || 'plain text'}</span>
        </div>
      </div>
    </div>
  );
}
