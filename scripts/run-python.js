#!/usr/bin/env node
/**
 * Cross-platform Python runner for Asset Bridge monorepo.
 * Automatically resolves .venv Python executable on Windows, macOS, and Linux.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const venvWindows = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
const venvUnix = path.join(rootDir, '.venv', 'bin', 'python');

let pythonBin = 'python';
if (fs.existsSync(venvWindows)) {
  pythonBin = venvWindows;
} else if (fs.existsSync(venvUnix)) {
  pythonBin = venvUnix;
}

const args = process.argv.slice(2);
const child = spawn(pythonBin, args, {
  stdio: 'inherit',
  shell: false,
  cwd: rootDir,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
