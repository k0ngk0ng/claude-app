import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import type { ContentBlock, Message } from '../types';

/**
 * Claude CLI stream-json protocol events:
 *
 * Text response:
 *   stream_event/message_start → content_block_start(text) → content_block_delta(text_delta) → assistant → result
 *
 * Tool use:
 *   stream_event/message_start → content_block_start(tool_use, name) → content_block_delta(input_json_delta)
 *   → assistant(tool_use blocks) → content_block_stop → message_delta(stop_reason:tool_use) → message_stop
 *   → user(tool_result) → [new message_start for next turn]
 */

interface StreamEvent {
  type: string;
  subtype?: string;
  session_id?: string;
  event?: {
    type: string;
    message?: {
      id?: string;
      model?: string;
      role?: string;
      content?: ContentBlock[];
      stop_reason?: string | null;
      usage?: Record<string, number>;
    };
    content_block?: {
      type: string;
      text?: string;
      name?: string;
      id?: string;
      input?: Record<string, unknown>;
    };
    delta?: {
      type?: string;
      text?: string;
      stop_reason?: string;
      partial_json?: string;
    };
    index?: number;
  };
  message?: {
    role: string;
    content: string | ContentBlock[];
    model?: string;
    stop_reason?: string | null;
  };
  tool_use_result?: {
    type?: string;
    file?: { filePath?: string };
  };
  result?: string;
  total_cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  is_error?: boolean;
  code?: number;
  signal?: string;
}

function extractTextFromContent(
  content: string | ContentBlock[] | undefined
): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text!)
    .join('\n');
}

export function useClaude() {
  const store = useAppStore();
  const processIdRef = useRef<string | null>(null);
  const streamingTextRef = useRef('');
  const currentModelRef = useRef<string | undefined>(undefined);
  const lastResultIdRef = useRef<string | null>(null);
  // Track current tool use block
  const currentToolIdRef = useRef<string | null>(null);
  const toolInputJsonRef = useRef('');

  useEffect(() => {
    const handler = (processId: string, raw: unknown) => {
      if (processId !== processIdRef.current) return;

      const event = raw as StreamEvent;

      if (event.type !== 'stream_event') {
        console.log('[claude]', event.type, event.subtype || '', event);
      }

      const {
        addMessage,
        setIsStreaming,
        setProcessId,
        setStreamingContent,
        clearStreamingContent,
        setCurrentSession,
        addToolActivity,
        updateToolActivity,
        clearToolActivities,
      } = useAppStore.getState();

      switch (event.type) {
        case 'system': {
          if (event.session_id) {
            setCurrentSession({ id: event.session_id });
          }
          break;
        }

        case 'stream_event': {
          const evt = event.event;
          if (!evt) break;

          switch (evt.type) {
            case 'message_start': {
              streamingTextRef.current = '';
              currentModelRef.current = evt.message?.model;
              currentToolIdRef.current = null;
              toolInputJsonRef.current = '';
              break;
            }

            case 'content_block_start': {
              if (evt.content_block?.type === 'tool_use') {
                // Tool use starting — track it
                const toolId = evt.content_block.id || `tool-${Date.now()}`;
                const toolName = evt.content_block.name || 'Unknown';
                currentToolIdRef.current = toolId;
                toolInputJsonRef.current = '';
                addToolActivity({
                  id: toolId,
                  name: toolName,
                  status: 'running',
                  timestamp: Date.now(),
                });
              }
              break;
            }

            case 'content_block_delta': {
              if (evt.delta?.type === 'text_delta' && evt.delta.text) {
                streamingTextRef.current += evt.delta.text;
                setStreamingContent(streamingTextRef.current);
              } else if (evt.delta?.type === 'input_json_delta' && evt.delta.partial_json) {
                // Accumulate tool input JSON for display
                toolInputJsonRef.current += evt.delta.partial_json;
                if (currentToolIdRef.current) {
                  const partial = toolInputJsonRef.current;
                  const { toolActivities } = useAppStore.getState();
                  const activity = toolActivities.find(a => a.id === currentToolIdRef.current);
                  if (activity) {
                    // Extract a brief description from common fields
                    const fileMatch = partial.match(/"file_path"\s*:\s*"([^"]+)"/);
                    const cmdMatch = partial.match(/"command"\s*:\s*"([^"]+)"/);
                    const patternMatch = partial.match(/"pattern"\s*:\s*"([^"]+)"/);
                    const urlMatch = partial.match(/"url"\s*:\s*"([^"]+)"/);
                    const promptMatch = partial.match(/"prompt"\s*:\s*"([^"]{0,80})/);
                    const descMatch = partial.match(/"description"\s*:\s*"([^"]{0,80})/);
                    const input = fileMatch?.[1] || cmdMatch?.[1] || patternMatch?.[1]
                      || urlMatch?.[1] || descMatch?.[1] || promptMatch?.[1];
                    const brief = input
                      ? (input.length > 60 ? '…' + input.slice(-57) : input)
                      : undefined;

                    // Always update inputFull, and set brief input once
                    useAppStore.setState({
                      toolActivities: toolActivities.map(a =>
                        a.id === currentToolIdRef.current
                          ? { ...a, inputFull: partial, input: a.input || brief }
                          : a
                      ),
                    });
                  }
                }
              }
              break;
            }

            case 'content_block_stop': {
              // Tool use block finished — keep as running until we get the result
              // Save the final full input
              if (currentToolIdRef.current) {
                const { toolActivities } = useAppStore.getState();
                useAppStore.setState({
                  toolActivities: toolActivities.map(a =>
                    a.id === currentToolIdRef.current
                      ? { ...a, inputFull: toolInputJsonRef.current || a.inputFull }
                      : a
                  ),
                });
                currentToolIdRef.current = null;
                toolInputJsonRef.current = '';
              }
              break;
            }

            case 'message_delta': {
              // stop_reason: "tool_use" means Claude is waiting for tool results
              // stop_reason: "end_turn" means Claude is done
              break;
            }

            case 'message_stop':
              break;

            default:
              break;
          }
          break;
        }

        case 'assistant': {
          // Complete assistant message snapshot
          const text = extractTextFromContent(event.message?.content);
          if (text) {
            streamingTextRef.current = text;
            setStreamingContent(text);
          }
          break;
        }

        case 'user': {
          // Tool result — Claude CLI executed a tool and got results
          // Extract tool_use_id and result content to update the activity
          const msg = event.message;
          if (msg && Array.isArray(msg.content)) {
            for (const block of msg.content as any[]) {
              if (block.type === 'tool_result' && block.tool_use_id) {
                const resultContent = typeof block.content === 'string'
                  ? block.content
                  : '';
                // Truncate long results for display
                const truncated = resultContent.length > 500
                  ? resultContent.slice(0, 500) + '\n…(truncated)'
                  : resultContent;

                const { toolActivities } = useAppStore.getState();
                useAppStore.setState({
                  toolActivities: toolActivities.map(a =>
                    a.id === block.tool_use_id
                      ? { ...a, status: 'done' as const, output: truncated }
                      : a
                  ),
                });
              }
            }
          }
          break;
        }

        case 'result': {
          const resultId = (raw as any).uuid || event.session_id || processId;
          if (resultId === lastResultIdRef.current) {
            console.log('[claude] duplicate result ignored', resultId);
            break;
          }
          lastResultIdRef.current = resultId;

          setIsStreaming(false);
          clearStreamingContent();
          clearToolActivities();

          const resultText = typeof event.result === 'string'
            ? event.result
            : streamingTextRef.current;

          if (resultText) {
            const message: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: resultText,
              timestamp: new Date().toISOString(),
              model: currentModelRef.current,
              costUsd: event.total_cost_usd,
              durationMs: event.duration_ms,
            };
            addMessage(message);
          }

          streamingTextRef.current = '';
          currentModelRef.current = undefined;

          if (event.session_id) {
            setCurrentSession({ id: event.session_id });
          }
          break;
        }

        case 'error': {
          setIsStreaming(false);
          clearStreamingContent();
          clearToolActivities();

          const errorText =
            typeof event.message?.content === 'string'
              ? event.message.content
              : 'An error occurred';
          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: `Error: ${errorText}`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case 'exit': {
          setIsStreaming(false);
          clearStreamingContent();
          clearToolActivities();
          setProcessId(null);
          processIdRef.current = null;
          streamingTextRef.current = '';
          break;
        }

        case 'raw': {
          console.log('[claude raw]', event.message?.content);
          break;
        }

        default:
          console.log('[claude event]', event.type, event);
          break;
      }
    };

    window.api.claude.onMessage(handler);
    return () => {
      window.api.claude.removeMessageListener(handler);
    };
  }, []);

  const startSession = useCallback(
    async (cwd: string, sessionId?: string) => {
      if (processIdRef.current) {
        await window.api.claude.kill(processIdRef.current);
        processIdRef.current = null;
      }

      streamingTextRef.current = '';
      currentModelRef.current = undefined;

      const pid = await window.api.claude.spawn(cwd, sessionId);
      processIdRef.current = pid;
      useAppStore.getState().setProcessId(pid);
      useAppStore.getState().setIsStreaming(false);
      return pid;
    },
    []
  );

  const sendMessage = useCallback(async (content: string) => {
    const { addMessage, setIsStreaming, clearStreamingContent, clearToolActivities } =
      useAppStore.getState();

    // If no process, need to spawn one first
    const pid = processIdRef.current;
    if (!pid) return;

    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    });
    setIsStreaming(true);
    clearStreamingContent();
    clearToolActivities();
    streamingTextRef.current = '';

    await window.api.claude.send(pid, content);
  }, []);

  const stopSession = useCallback(async () => {
    if (processIdRef.current) {
      await window.api.claude.kill(processIdRef.current);
      processIdRef.current = null;
      const { setProcessId, setIsStreaming, clearStreamingContent, clearToolActivities } =
        useAppStore.getState();
      setProcessId(null);
      setIsStreaming(false);
      clearStreamingContent();
      clearToolActivities();
      streamingTextRef.current = '';
    }
  }, []);

  return {
    startSession,
    sendMessage,
    stopSession,
    isStreaming: store.currentSession.isStreaming,
    processId: store.currentSession.processId,
  };
}
