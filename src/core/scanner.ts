import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import type { Config, Project } from '../types/index.js';
import { getGitInfo, getGitStatus } from './git.js';

/** Windows 用户目录下的壳文件夹/联接，常无权限访问会导致 EPERM */
const WINDOWS_SCAN_IGNORE = [
  '**/My Pictures/**',
  '**/My Music/**',
  '**/My Videos/**',
  '**/我的图片/**',
  '**/我的音乐/**',
  '**/我的视频/**',
  '**/SendTo/**',
  '**/PrintHood/**',
  '**/NetHood/**',
  '**/Recent/**',
  '**/Templates/**',
  '**/「开始」菜单/**',
  '**/Start Menu/**',
];

function getScanIgnores(ignore: string[]): string[] {
  if (process.platform === 'win32') {
    return [...ignore, ...WINDOWS_SCAN_IGNORE];
  }
  return ignore;
}

function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'EPERM' || code === 'EACCES';
}

export async function scanProjects(config: Config): Promise<Project[]> {
  const projects: Project[] = [];
  const { roots, maxDepth, ignore } = config.workspace;

  for (const root of roots) {
    const found = await scanDirectory(root, maxDepth, ignore);
    projects.push(...found);
  }

  // Sort by last modified (most recent first)
  projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  return projects;
}

async function scanDirectory(
  root: string,
  maxDepth: number,
  ignore: string[]
): Promise<Project[]> {
  const projects: Project[] = [];

  // Check if root exists
  try {
    await fs.access(root);
  } catch {
    return projects;
  }

  // Find directories with .git or package.json
  const patterns = [];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const depthPattern = Array(depth).join('*/');
    patterns.push(`${depthPattern}.git`);
    patterns.push(`${depthPattern}package.json`);
  }

  const scanIgnores = getScanIgnores(ignore);
  let matches: string[] = [];

  try {
    matches = await fg(patterns, {
      cwd: root,
      ignore: scanIgnores,
      onlyFiles: false,
      absolute: true,
      followSymbolicLinks: false,
      suppressErrors: true,
    });
  } catch (error) {
    if (isPermissionError(error)) {
      console.warn(`[scanner] 跳过无权限目录: ${root} (${(error as Error).message})`);
      return projects;
    }
    throw error;
  }

  // Get unique project directories (parent of .git or package.json)
  const projectDirs = new Set<string>();
  for (const match of matches) {
    const parent = match.endsWith('.git')
      ? path.dirname(match)
      : match.endsWith('package.json')
        ? path.dirname(match)
        : match;
    projectDirs.add(parent);
  }

  // Build project info
  for (const dir of projectDirs.values()) {
    const project = await buildProjectInfo(dir);
    if (project) {
      projects.push(project);
    }
  }

  return projects;
}

async function buildProjectInfo(dir: string): Promise<Project | null> {
  const name = path.basename(dir);

  // Check for .git
  const gitDir = path.join(dir, '.git');
  let isGit = false;
  try {
    await fs.access(gitDir);
    isGit = true;
  } catch {
    // Not a git repo
  }

  // Check for package.json
  const packageJsonPath = path.join(dir, 'package.json');
  let hasPackageJson = false;
  let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | undefined;

  try {
    await fs.access(packageJsonPath);
    hasPackageJson = true;
    packageManager = await detectPackageManager(dir);
  } catch {
    // No package.json
  }

  // Skip if neither git nor package.json
  if (!isGit && !hasPackageJson) {
    return null;
  }

  // Get last modified time
  let lastModified = new Date();
  try {
    const stat = await fs.stat(dir);
    lastModified = stat.mtime;
  } catch {
    // Use current time as fallback
  }

  // Get git info if available
  let branch: string | undefined;
  let remote: string | undefined;
  let status: 'clean' | 'dirty' | 'unknown' = 'unknown';
  let uncommittedChanges: number | undefined;
  let ahead: number | undefined;
  let behind: number | undefined;

  if (isGit) {
    try {
      const gitInfo = await getGitInfo(dir);
      branch = gitInfo.branch;
      remote = gitInfo.remote;

      const gitStatus = await getGitStatus(dir);
      status = gitStatus.status;
      uncommittedChanges = gitStatus.uncommittedChanges;
      ahead = gitStatus.ahead;
      behind = gitStatus.behind;
    } catch (error) {
      // Git info failed, use defaults
    }
  }

  return {
    name,
    path: dir,
    isGit,
    branch,
    remote,
    status,
    uncommittedChanges,
    ahead,
    behind,
    lastModified,
    packageManager,
    hasPackageJson,
  };
}

async function detectPackageManager(
  dir: string
): Promise<'npm' | 'yarn' | 'pnpm' | 'bun' | undefined> {
  const locks = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'bun.lockb', manager: 'bun' },
    { file: 'package-lock.json', manager: 'npm' },
  ];

  for (const { file, manager } of locks) {
    try {
      await fs.access(path.join(dir, file));
      return manager as 'npm' | 'yarn' | 'pnpm' | 'bun';
    } catch {
      // File doesn't exist
    }
  }

  // Default to npm if package.json exists but no lock file
  return 'npm';
}