#!/usr/bin/env node

/**
 * Sync app version from git tag or commit hash.
 *
 * - If HEAD is tagged with vX.Y.Z → use X.Y.Z
 * - Otherwise → use 0.0.0-<short-hash>
 *
 * Updates package.json in place so electron-forge picks it up.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkgPath = resolve(root, 'package.json');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: root, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

// Try to get a version tag on the current commit (e.g. v1.2.3)
const tag = run('git describe --tags --exact-match HEAD');
let version;

if (tag && /^v?\d+\.\d+\.\d+/.test(tag)) {
  // Strip leading 'v' if present
  version = tag.replace(/^v/, '');
} else {
  // No tag — use commit hash
  const hash = run('git rev-parse --short HEAD') || 'unknown';
  version = `0.0.0-${hash}`;
}

// Read and update package.json
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const oldVersion = pkg.version;
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Version: ${oldVersion} → ${version}`);
