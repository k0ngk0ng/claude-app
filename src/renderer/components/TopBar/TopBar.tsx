import React from 'react';
import { useAppStore } from '../../stores/appStore';

export function TopBar() {
  const { currentSession, currentProject, panels, togglePanel, platform } =
    useAppStore();

  const isMac = platform === 'mac';
  const title = currentSession.id
    ? `${currentProject.name} — Thread`
    : currentProject.name || 'Claude App';

  return (
    <div
      className={`
        flex items-center justify-between px-4 h-12 shrink-0
        bg-bg titlebar-drag
        ${isMac && !panels.sidebar ? 'pl-20' : ''}
      `}
    >
      {/* Left: sidebar toggle + title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Sidebar toggle */}
        <button
          onClick={() => togglePanel('sidebar')}
          className="titlebar-no-drag p-1.5 rounded-md hover:bg-surface-hover
                     text-text-secondary hover:text-text-primary transition-colors"
          title="Toggle sidebar (⌘B)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="1.5"
              y="2.5"
              width="13"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="5.5"
              y1="2.5"
              x2="5.5"
              y2="13.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>

        {/* Title */}
        <h1 className="text-sm font-medium text-text-primary truncate">
          {title}
        </h1>

        {currentSession.isStreaming && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-text-muted">Thinking…</span>
          </div>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        {/* Terminal toggle */}
        <button
          onClick={() => togglePanel('terminal')}
          className={`p-1.5 rounded-md transition-colors ${
            panels.terminal
              ? 'bg-accent-muted text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }`}
          title="Toggle terminal (⌘T)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="1.5"
              y="2.5"
              width="13"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M4.5 6l2.5 2-2.5 2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="8.5"
              y1="10"
              x2="11.5"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Diff toggle — Git compare / source control icon */}
        <button
          onClick={() => togglePanel('diff')}
          className={`p-1.5 rounded-md transition-colors ${
            panels.diff
              ? 'bg-accent-muted text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }`}
          title="Toggle changes (⌘D)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {/* Git branch/merge style icon — two nodes connected by paths */}
            <circle cx="4.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="11.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="4.5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M4.5 5.5v5M11.5 5.5C11.5 8.5 4.5 7 4.5 10"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
