#!/usr/bin/env node
/**
 * 生成 PM2 ecosystem.config.json（跨平台路径）
 * 用法: node scripts/write-ecosystem.mjs [installDir] [port]
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const installDir = path.resolve(process.argv[2] || process.cwd());
const port = process.argv[3] || process.env.DEVHUB_PORT || '3200';
const logDir = path.join(os.homedir(), '.devhub', 'logs');

fs.mkdirSync(logDir, { recursive: true });

const config = {
  apps: [
    {
      name: 'devhub',
      script: 'dist/index.js',
      args: `--no-open --port ${port}`,
      cwd: installDir,
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 3,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: path.join(logDir, 'error.log'),
      out_file: path.join(logDir, 'out.log'),
    },
  ],
};

const outFile = path.join(installDir, 'ecosystem.config.json');
fs.writeFileSync(outFile, JSON.stringify(config, null, 2), 'utf-8');
console.log(`[OK] 已写入 ${outFile}`);
