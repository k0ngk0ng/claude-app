import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Attachment {
  name: string;
  path: string;
  type: 'image';
  preview?: string; // data URL for image preview
}

interface InputBarProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function InputBar({ onSend, isStreaming, onStop }: InputBarProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
  }, [value]);

  // Listen for suggestion card selections
  useEffect(() => {
    function handleSuggestion(e: Event) {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      setValue(customEvent.detail.prompt);
      textareaRef.current?.focus();
    }

    window.addEventListener('suggestion-selected', handleSuggestion);
    return () =>
      window.removeEventListener('suggestion-selected', handleSuggestion);
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming) return;

    // Build message with attachment references
    let message = trimmed;
    if (attachments.length > 0) {
      const filePaths = attachments.map((a) => a.path).join('\n');
      message = message
        ? `${message}\n\n[Attached files:\n${filePaths}]`
        : `[Attached files:\n${filePaths}]`;
    }

    onSend(message);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, attachments, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleAddFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            path: (file as any).path || file.name,
            type: 'image',
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="shrink-0 bg-bg px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex flex-col bg-surface rounded-xl border border-border focus-within:border-border-light transition-colors">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex gap-2 px-3 pt-3 flex-wrap">
              {attachments.map((att, index) => (
                <div
                  key={index}
                  className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border bg-bg"
                >
                  {att.preview && (
                    <img
                      src={att.preview}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface-active
                               text-text-primary flex items-center justify-center
                               opacity-0 group-hover:opacity-100 transition-opacity
                               shadow-md text-xs"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <span className="text-[9px] text-white truncate block">
                      {att.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-1">
            {/* Add file button */}
            <div className="pl-2 pb-2.5">
              <button
                onClick={handleAddFile}
                disabled={isStreaming}
                className="flex items-center justify-center w-8 h-8 rounded-lg
                           text-text-muted hover:text-text-primary hover:bg-surface-hover
                           disabled:opacity-30 transition-colors"
                title="Add image"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Claude anything, @ to add files, / for commands"
              disabled={isStreaming}
              rows={2}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted
                         px-2 py-3 resize-none outline-none min-h-[88px] max-h-[300px]
                         disabled:opacity-50"
            />

            {/* Send / Stop button */}
            <div className="pr-2 pb-2.5">
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center w-8 h-8 rounded-lg
                             bg-error/20 text-error hover:bg-error/30 transition-colors"
                  title="Stop generation"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="8"
                      height="8"
                      rx="1"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!value.trim() && attachments.length === 0}
                  className="flex items-center justify-center w-8 h-8 rounded-lg
                             bg-accent text-white hover:bg-accent-hover
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-colors"
                  title="Send message (Enter)"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 12V2M7 2l-4 4M7 2l4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Model info */}
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[11px] text-text-muted">
            Claude Code • Shift+Enter for new line
          </span>
          <span className="text-[11px] text-text-muted">
            {value.length > 0 && `${value.length} chars`}
          </span>
        </div>
      </div>
    </div>
  );
}
