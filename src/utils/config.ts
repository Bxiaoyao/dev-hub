import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import type { Config } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.devhub');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

const DEFAULT_CONFIG: Config = {
  workspace: {
    roots: ['~/Desktop', '~/Documents', '~/Projects', '~/Work', '~/Code', '~/Developer'],
    maxDepth: 2,
    ignore: ['node_modules', '.turbo', 'dist', '.next', 'build', '.cache', '.git', 'Library', 'Applications'],
  },
  editor: {
    default: 'cursor',
    fallback: ['code'],
  },
  terminal: {
    default: 'terminal',
    custom: null,
  },
  hooks: {
    afterClone: ['{packageManager} install'],
    afterBranchSwitch: ['{packageManager} install'],
  },
  display: {
    dateFormat: 'relative',
    showSize: false,
    theme: 'auto',
  },
  export: {
    defaultFormat: 'yaml',
    includeHooks: true,
  },
  tags: {
    presets: ['工作', '个人', '归档'],
  },
  git: {
    credentials: {
      username: undefined,
      password: undefined,
      token: undefined,
      useSSH: true,
    },
    rememberCredentials: false,
  },
};

export async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(path.join(CONFIG_DIR, 'templates'), { recursive: true });
    await fs.mkdir(path.join(CONFIG_DIR, 'snapshots'), { recursive: true });
    await fs.mkdir(path.join(CONFIG_DIR, 'cache'), { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

export async function configExists(): Promise<boolean> {
  try {
    await fs.access(CONFIG_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(): Promise<Config> {
  await ensureConfigDir();

  if (!(await configExists())) {
    await saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  const content = await fs.readFile(CONFIG_FILE, 'utf-8');
  const parsed = YAML.parse(content);
  return { ...DEFAULT_CONFIG, ...parsed };
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  const content = YAML.stringify(config);
  await fs.writeFile(CONFIG_FILE, content, 'utf-8');
}

export async function initConfig(): Promise<Config> {
  const config = await loadConfig();

  // Expand ~ to home directory in roots
  config.workspace.roots = config.workspace.roots.map((root) =>
    root.startsWith('~') ? path.join(os.homedir(), root.slice(1)) : root
  );

  return config;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}