import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { ToolActivity } from '../../stores/appStore';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';

export function ChatView() {
  const { currentSession, streamingContent, toolActivities } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming } = currentSession;
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom on new messages, streaming content, or tool activities
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent, toolActivities.length]);

  if (!hasMessages && !isStreaming) {
    return <WelcomeScreen />;
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date().toISOString(),
              isStreaming: true,
            }}
          />
        )}

        {/* Tool activities */}
        {isStreaming && toolActivities.length > 0 && (
          <ToolActivitiesDisplay activities={toolActivities} />
        )}

        {/* Streaming indicator when no content and no tools yet */}
        {isStreaming && !streamingContent && toolActivities.length === 0 && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2 py-2">
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-sm text-text-muted">Claude is thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Tool Activities Display ────────────────────────────────────────

const TOOL_ICONS: Record<string, string> = {
  Read: '📄',
  Edit: '✏️',
  Write: '📝',
  Bash: '⚡',
  Grep: '🔍',
  Glob: '📁',
  WebFetch: '🌐',
  WebSearch: '🔎',
  Task: '📋',
  NotebookEdit: '📓',
};

const TOOL_LABELS: Record<string, string> = {
  Read: 'Reading',
  Edit: 'Editing',
  Write: 'Writing',
  Bash: 'Running command',
  Grep: 'Searching',
  Glob: 'Finding files',
  WebFetch: 'Fetching URL',
  WebSearch: 'Searching web',
  Task: 'Running task',
  NotebookEdit: 'Editing notebook',
};

function ToolActivitiesDisplay({ activities }: { activities: ToolActivity[] }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="space-y-1.5">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-2 text-xs"
            >
              {/* Status indicator */}
              {activity.status === 'running' ? (
                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                </div>
              ) : (
                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-success">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Tool icon */}
              <span className="shrink-0">{TOOL_ICONS[activity.name] || '🔧'}</span>

              {/* Tool label + input */}
              <span className={`${activity.status === 'running' ? 'text-text-secondary' : 'text-text-muted'}`}>
                {TOOL_LABELS[activity.name] || `Using ${activity.name}`}
              </span>
              {activity.input && (
                <span className="text-text-muted font-mono truncate max-w-[300px]" title={activity.input}>
                  {activity.input}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
