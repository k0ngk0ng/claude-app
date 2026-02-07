import fs from 'fs';
import path from 'path';
import { getSessionsDir, encodePath } from './platform';

const isWindows = process.platform === 'win32';

export interface SessionInfo {
  id: string;
  projectPath: string;
  projectName: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

interface SessionIndexEntry {
  sessionId: string;
  fullPath?: string;
  fileMtime?: number;
  firstPrompt?: string;
  summary?: string;
  messageCount?: number;
  created?: string;
  modified?: string;
  gitBranch?: string;
  projectPath?: string;
  isSidechain?: boolean;
}

interface SessionIndexFile {
  version: number;
  entries: SessionIndexEntry[];
}

interface MessageEntry {
  type: string;
  message?: {
    role: string;
    content: string | unknown[];
  };
  timestamp?: string;
  uuid?: string;
  session_id?: string;
}

class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = getSessionsDir();
  }

  listAllProjects(): { name: string; path: string; encodedPath: string }[] {
    const projects: { name: string; path: string; encodedPath: string }[] = [];

    try {
      const entries = fs.readdirSync(this.sessionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const encodedPath = entry.name;
          // We don't try to decode the path here — it's lossy (hyphens are ambiguous).
          // The real projectPath comes from sessions-index.json entries.
          // We just use the last segment as a display name fallback.
          const parts = encodedPath.replace(/^-+/, '').split('-');
          const projectName = parts[parts.length - 1] || encodedPath;
          projects.push({
            name: projectName,
            path: encodedPath, // Keep encoded — used as directory lookup key
            encodedPath,
          });
        }
      }
    } catch {
      // Sessions directory may not exist yet
    }

    return projects;
  }

  listSessions(encodedOrPath: string): SessionIndexEntry[] {
    // If it looks like an encoded path (starts with -), use directly; otherwise encode it
    const encoded = encodedOrPath.startsWith('-') || encodedOrPath.startsWith('Users')
      ? encodedOrPath
      : encodePath(encodedOrPath);
    const projectDir = path.join(this.sessionsDir, encoded);
    const indexPath = path.join(projectDir, 'sessions-index.json');

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      const parsed: SessionIndexFile = JSON.parse(content);
      if (parsed && Array.isArray(parsed.entries)) {
        return parsed.entries;
      }
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      // No sessions-index.json — fallback: scan .jsonl files
      return this.scanJsonlFiles(projectDir);
    }
  }

  /**
   * Fallback for projects without sessions-index.json.
   * Scans .jsonl files and extracts basic session info.
   */
  private scanJsonlFiles(projectDir: string): SessionIndexEntry[] {
    const entries: SessionIndexEntry[] = [];

    try {
      const files = fs.readdirSync(projectDir);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const sessionId = file.replace('.jsonl', '');
        const filePath = path.join(projectDir, file);

        try {
          const stat = fs.statSync(filePath);
          // Read first few lines to get the first user prompt
          const fd = fs.openSync(filePath, 'r');
          const buf = Buffer.alloc(4096);
          const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
          fs.closeSync(fd);

          const head = buf.toString('utf-8', 0, bytesRead);
          const lines = head.split('\n').filter((l) => l.trim());

          let firstPrompt = '';
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'user' && parsed.message?.role === 'user') {
                const content = parsed.message.content;
                if (typeof content === 'string') {
                  firstPrompt = content.slice(0, 200);
                } else if (Array.isArray(content)) {
                  const textBlock = content.find((b: any) => b.type === 'text' && b.text);
                  if (textBlock) firstPrompt = textBlock.text.slice(0, 200);
                }
                break;
              }
            } catch {
              // skip malformed line
            }
          }

          entries.push({
            sessionId,
            fullPath: filePath,
            fileMtime: stat.mtimeMs,
            firstPrompt: firstPrompt || 'Untitled',
            summary: undefined,
            messageCount: undefined,
            created: stat.birthtime.toISOString(),
            modified: stat.mtime.toISOString(),
            isSidechain: false,
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    // Sort by modified time descending
    entries.sort((a, b) => (b.fileMtime || 0) - (a.fileMtime || 0));
    return entries;
  }

  getAllSessions(): SessionInfo[] {
    const allSessions: SessionInfo[] = [];
    const projects = this.listAllProjects();

    for (const project of projects) {
      const sessions = this.listSessions(project.path);
      for (const session of sessions) {
        if (session.isSidechain) continue; // Skip sidechain sessions
        const resolvedPath = session.projectPath || project.path;
        const resolvedName = resolvedPath
          ? resolvedPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || project.name
          : project.name;
        allSessions.push({
          id: session.sessionId,
          projectPath: resolvedPath,
          projectName: resolvedName,
          title: session.summary || session.firstPrompt?.slice(0, 80) || 'Untitled',
          lastMessage: session.firstPrompt || '',
          updatedAt: session.modified || session.created || '',
        });
      }
    }

    // Sort by most recently updated
    allSessions.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    return allSessions;
  }

  getSessionMessages(projectPath: string, sessionId: string): MessageEntry[] {
    const encoded = encodePath(projectPath);
    const sessionFile = path.join(this.sessionsDir, encoded, `${sessionId}.jsonl`);

    // Try encoded path first, then try projectPath as-is (it might already be encoded dir name)
    let filePath = sessionFile;
    if (!fs.existsSync(filePath)) {
      const altPath = path.join(this.sessionsDir, projectPath, `${sessionId}.jsonl`);
      if (fs.existsSync(altPath)) {
        filePath = altPath;
      }
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      const messages: MessageEntry[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          messages.push(parsed);
        } catch {
          // Skip malformed lines
        }
      }

      return messages;
    } catch {
      return [];
    }
  }

  watchForChanges(callback: () => void): fs.FSWatcher | null {
    try {
      const watcher = fs.watch(this.sessionsDir, { recursive: true }, () => {
        callback();
      });
      return watcher;
    } catch {
      return null;
    }
  }
}

export const sessionManager = new SessionManager();
