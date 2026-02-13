import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CommandInfo } from '../../types';

interface SlashCommandPopupProps {
  query: string;
  visible: boolean;
  onSelect: (command: CommandInfo) => void;
  onClose: () => void;
}

export function SlashCommandPopup({
  query,
  visible,
  onSelect,
  onClose,
}: SlashCommandPopupProps) {
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [filtered, setFiltered] = useState<CommandInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Load commands when popup becomes visible
  useEffect(() => {
    if (!visible) return;
    window.api.commands.list().then((list) => {
      setCommands(list);
    }).catch(() => {
      setCommands([]);
    });
  }, [visible]);

  // Filter commands by query
  useEffect(() => {
    if (!query) {
      setFiltered(commands);
    } else {
      const q = query.toLowerCase();
      setFiltered(commands.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      ));
    }
    setSelectedIndex(0);
  }, [query, commands]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      }
    },
    [visible, filtered, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    if (visible) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [visible, handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-border
                 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M4.5 6l2 1.5-2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 10h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span>Slash commands</span>
        </div>
      </div>

      {/* Command list */}
      <div ref={listRef} className="max-h-[280px] overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-text-muted">
            {commands.length === 0
              ? 'No commands configured. Add commands in Settings → Commands.'
              : `No commands matching "${query}"`}
          </div>
        )}

        {filtered.map((cmd, index) => (
          <button
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors
                        ${index === selectedIndex ? 'bg-surface-hover' : ''}`}
          >
            {/* Type badge */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
              cmd.type === 'md'
                ? 'bg-accent/10 text-accent'
                : 'bg-warning/10 text-warning'
            }`}>
              .{cmd.type}
            </span>

            {/* Name + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-text-primary">/{cmd.name}</span>
                {cmd.argumentHint && (
                  <span className="text-[10px] text-text-muted">{cmd.argumentHint}</span>
                )}
              </div>
              {cmd.description && (
                <div className="text-[10px] text-text-muted truncate mt-0.5">
                  {cmd.description}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
