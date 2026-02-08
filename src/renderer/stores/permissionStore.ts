import { create } from 'zustand';

const STORAGE_KEY = 'claude-app-allowed-tools';

export interface PermissionRequest {
  id: string;
  toolName: string;       // e.g. "Bash"
  command: string;        // e.g. "git add src/..."
  toolPattern: string;    // e.g. "Bash(git add *)"
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
}

interface PermissionStore {
  // Persistent allowed tool patterns (survive across sessions)
  allowedTools: string[];
  // Pending permission requests shown in chat
  pendingRequests: PermissionRequest[];

  // Actions
  addRequest: (request: PermissionRequest) => void;
  approveRequest: (id: string) => void;
  denyRequest: (id: string) => void;
  clearRequests: () => void;
  addAllowedTool: (pattern: string) => void;
  removeAllowedTool: (pattern: string) => void;
  clearAllowedTools: () => void;
}

function loadAllowedTools(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveAllowedTools(tools: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch { /* ignore */ }
}

/**
 * Extract a tool pattern from a denied command.
 * e.g. "git add src/foo.ts src/bar.ts" → "Bash(git add *)"
 * e.g. "git commit -m 'message'" → "Bash(git commit *)"
 * e.g. "npm install" → "Bash(npm install *)"
 */
export function extractToolPattern(toolName: string, command: string): string {
  if (toolName !== 'Bash') {
    return toolName;
  }

  // Extract the first 1-2 words as the command prefix
  const trimmed = command.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0) return `Bash(*)`;

  // For git commands, use "git <subcommand> *"
  if (parts[0] === 'git' && parts.length > 1) {
    return `Bash(git ${parts[1]} *)`;
  }

  // For npm/yarn/pnpm commands, use "<pkg> <subcommand> *"
  if (['npm', 'yarn', 'pnpm', 'npx', 'bun'].includes(parts[0]) && parts.length > 1) {
    return `Bash(${parts[0]} ${parts[1]} *)`;
  }

  // For other commands, use "<command> *"
  return `Bash(${parts[0]} *)`;
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  allowedTools: loadAllowedTools(),
  pendingRequests: [],

  addRequest: (request) =>
    set((state) => ({
      pendingRequests: [...state.pendingRequests, request],
    })),

  approveRequest: (id) => {
    const state = get();
    const request = state.pendingRequests.find(r => r.id === id);
    if (!request) return;

    // Add the tool pattern to allowed list (deduplicate)
    const pattern = request.toolPattern;
    const newAllowed = state.allowedTools.includes(pattern)
      ? state.allowedTools
      : [...state.allowedTools, pattern];
    saveAllowedTools(newAllowed);

    set({
      allowedTools: newAllowed,
      pendingRequests: state.pendingRequests.map(r =>
        r.id === id ? { ...r, status: 'approved' as const } : r
      ),
    });
  },

  denyRequest: (id) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.map(r =>
        r.id === id ? { ...r, status: 'denied' as const } : r
      ),
    })),

  clearRequests: () => set({ pendingRequests: [] }),

  addAllowedTool: (pattern) => {
    const state = get();
    if (state.allowedTools.includes(pattern)) return;
    const newAllowed = [...state.allowedTools, pattern];
    saveAllowedTools(newAllowed);
    set({ allowedTools: newAllowed });
  },

  removeAllowedTool: (pattern) => {
    const state = get();
    const newAllowed = state.allowedTools.filter(t => t !== pattern);
    saveAllowedTools(newAllowed);
    set({ allowedTools: newAllowed });
  },

  clearAllowedTools: () => {
    saveAllowedTools([]);
    set({ allowedTools: [] });
  },
}));
