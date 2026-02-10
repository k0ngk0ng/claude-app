import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

// IDs that are controlled elsewhere (General → Send key) and should not appear here
const HIDDEN_KEYBINDINGS = new Set(['send-message', 'new-line']);

function formatKeyEvent(e: KeyboardEvent): string | null {
  // Ignore lone modifier presses
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return null;

  let prefix = '';
  if (e.metaKey) prefix += 'Cmd+';
  if (e.ctrlKey) prefix += 'Ctrl+';
  if (e.altKey) prefix += 'Opt+';
  if (e.shiftKey) prefix += 'Shift+';

  // Normalize key name
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key === 'Escape') key = 'Esc';
  else if (key.length === 1) key = key.toUpperCase();

  return prefix + key;
}

export function KeybindingsSection() {
  const { settings, updateKeybinding } = useSettingsStore();
  const { keybindings } = settings;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<string>('');
  const inputRef = useRef<HTMLButtonElement>(null);

  const visibleBindings = keybindings.filter((kb) => !HIDDEN_KEYBINDINGS.has(kb.id));

  const startEditing = useCallback((id: string) => {
    setEditingId(id);
    setPendingKeys('');
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setPendingKeys('');
  }, []);

  const saveKeybinding = useCallback((id: string, keys: string) => {
    if (keys) {
      updateKeybinding(id, keys);
    }
    setEditingId(null);
    setPendingKeys('');
  }, [updateKeybinding]);

  // Listen for key events when editing
  useEffect(() => {
    if (!editingId) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        cancelEditing();
        return;
      }

      const formatted = formatKeyEvent(e);
      if (formatted) {
        setPendingKeys(formatted);
        // Auto-save after a short delay so user sees what they pressed
        setTimeout(() => {
          saveKeybinding(editingId!, formatted);
        }, 300);
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingId, cancelEditing, saveKeybinding]);

  // Focus the editing button when it appears
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Keybindings</h2>
      <p className="text-sm text-text-muted mb-6">
        Keyboard shortcuts for common actions. Click a shortcut to change it.
      </p>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface">
              <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5">Action</th>
              <th className="text-right text-xs font-medium text-text-muted px-4 py-2.5">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {visibleBindings.map((kb, index) => {
              const isEditing = editingId === kb.id;

              return (
                <tr
                  key={kb.id}
                  className={`${index !== visibleBindings.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-primary">{kb.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <button
                        ref={inputRef}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 border border-accent
                                   rounded text-xs font-mono text-accent min-w-[80px] justify-center
                                   outline-none animate-pulse"
                        onBlur={cancelEditing}
                      >
                        {pendingKeys || 'Press keys…'}
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(kb.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border
                                   rounded text-xs font-mono text-text-secondary
                                   hover:border-accent/50 hover:text-text-primary transition-colors
                                   cursor-pointer"
                        title="Click to change shortcut"
                      >
                        {kb.keys}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted mt-4">
        Click a shortcut to reassign it. Press <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[10px] font-mono">Esc</kbd> to cancel.
        Send message key is configured in General settings.
      </p>
    </div>
  );
}
