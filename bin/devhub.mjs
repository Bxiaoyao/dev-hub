#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsxPath = resolve(__dirname, '../node_modules/tsx/dist/cli.mjs');
const entryPoint = resolve(__dirname, '../src/index.ts');

spawn('node', [tsxPath, entryPoint, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false
});
