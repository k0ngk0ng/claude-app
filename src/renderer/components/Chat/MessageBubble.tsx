import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '../../types';
import { ToolCard } from './ToolCard';

interface MessageBubbleProps {
  message: Message;
  hideAvatar?: boolean;
}

export function MessageBubble({ message, hideAvatar }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="px-3 py-1.5 rounded-lg bg-surface text-text-muted text-xs max-w-lg text-center">
          {message.content}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md bg-user-bubble text-text-primary">
          <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="text-[10px] text-text-muted mt-1.5 text-right">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={`flex items-start ${hideAvatar ? '' : 'gap-3'}`}>
      {/* Avatar */}
      {!hideAvatar && (
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
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {message.content && (
          <div
            className={`text-[14px] leading-relaxed text-text-primary markdown-content ${
              message.isStreaming ? 'streaming-cursor' : ''
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool use blocks — same card style as live streaming */}
        {message.toolUse && message.toolUse.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.toolUse.map((tool, idx) => {
              // Extract a brief input description from common fields
              const input = tool.input;
              const brief =
                (input.file_path as string) ||
                (input.command as string) ||
                (input.pattern as string) ||
                (input.url as string) ||
                (input.description as string) ||
                undefined;
              const briefTruncated = brief
                ? brief.length > 60
                  ? '…' + brief.slice(-57)
                  : brief
                : undefined;

              return (
                <ToolCard
                  key={idx}
                  name={tool.name}
                  input={briefTruncated}
                  inputFull={JSON.stringify(input)}
                  output={tool.result}
                  status="done"
                />
              );
            })}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
          <span>{formatTime(message.timestamp)}</span>
          {message.model && (
            <span className="opacity-60">{message.model}</span>
          )}
          {message.costUsd !== undefined && (
            <span className="opacity-60">
              ${message.costUsd.toFixed(4)}
            </span>
          )}
          {message.durationMs !== undefined && (
            <span className="opacity-60">
              {(message.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
