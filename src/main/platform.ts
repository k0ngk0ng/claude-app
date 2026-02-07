import os from 'os';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

export function getClaudeBinary(): string {
  const homeDir = os.homedir();

  if (isWindows) {
    const localPath = path.join(homeDir, '.local', 'bin', 'claude.cmd');
    try {
      const stat = require('fs').statSync(localPath);
      if (stat.isFile()) return localPath;
    } catch {
      // fall through
    }
    try {
      return execSync('where claude', { encoding: 'utf-8' }).trim().split('\n')[0];
    } catch {
      return 'claude';
    }
  }

  // macOS / Linux
  const localPath = path.join(homeDir, '.local', 'bin', 'claude');
  try {
    const stat = require('fs').statSync(localPath);
    if (stat.isFile()) return localPath;
  } catch {
    // fall through
  }
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    return 'claude';
  }
}

export function getSessionsDir(): string {
  return path.join(os.homedir(), '.claude', 'projects');
}

export function getHomePath(): string {
  return os.homedir();
}

export function encodePath(absolutePath: string): string {
  // Claude CLI encodes project paths by replacing /, \, :, . with hyphens.
  // The leading slash becomes a leading hyphen (e.g. /Users/foo → -Users-foo).
  return absolutePath.replace(/[/\\:.]/g, '-');
}

export function getDefaultShell(): string {
  if (isWindows) {
    // Prefer PowerShell over cmd.exe; COMSPEC is typically cmd.exe
    return 'powershell.exe';
  }
  return process.env.SHELL || '/bin/zsh';
}

export function getPlatform(): 'mac' | 'windows' | 'linux' {
  if (isMac) return 'mac';
  if (isWindows) return 'windows';
  return 'linux';
}

/**
 * Detect the active Claude model.
 * Priority: ANTHROPIC_MODEL env → ~/.claude/settings.json env.ANTHROPIC_MODEL
 *           → CLAUDE_CODE_MODEL env → settings.json env.CLAUDE_CODE_MODEL
 *           → fallback "claude-sonnet-4-20250514"
 */
export function getClaudeModel(): string {
  // 1. Check process env vars directly
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  if (process.env.CLAUDE_CODE_MODEL) return process.env.CLAUDE_CODE_MODEL;
  if (process.env.CLAUDE_MODEL) return process.env.CLAUDE_MODEL;

  // 2. Read from ~/.claude/settings.json
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    if (settings.env?.ANTHROPIC_MODEL) return settings.env.ANTHROPIC_MODEL;
    if (settings.env?.CLAUDE_CODE_MODEL) return settings.env.CLAUDE_CODE_MODEL;
    if (settings.env?.CLAUDE_MODEL) return settings.env.CLAUDE_MODEL;
  } catch {
    // settings.json not found or invalid
  }

  // 3. Fallback
  return 'claude-sonnet-4-20250514';
}
