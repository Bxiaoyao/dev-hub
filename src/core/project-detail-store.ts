import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { Project, BranchInfo, DependencyInfo, OutdatedPackage, SizeInfo } from '../types/index.js';
import { getBranches, getRecentCommits, type CommitInfo } from './git.js';
import { getProjectSize } from './size.js';
import { getDependencyInfo, getOutdatedPackages } from './deps.js';

const DETAIL_CACHE_DIR = path.join(os.homedir(), '.devhub', 'cache', 'details');
const DETAIL_TTL_MS = Number(process.env.DEVHUB_DETAIL_CACHE_TTL_MS) || 10 * 60 * 1000;
/** 提交记录格式变更时递增，使旧缓存失效 */
const DETAIL_CACHE_VERSION = 2;

export interface ProjectDetailPayload {
  name: string;
  path: string;
  isGit: boolean;
  branch?: string;
  remote?: string;
  status: Project['status'];
  uncommittedChanges?: number;
  ahead?: number;
  behind?: number;
  lastModified: Date;
  packageManager?: Project['packageManager'];
  nodeVersion?: string;
  hasPackageJson: boolean;
  tags?: string[];
  branches: BranchInfo[];
  commits: CommitInfo[];
  size: SizeInfo;
  dependencies: DependencyInfo | null;
  outdatedPackages: OutdatedPackage[];
}

export interface ProjectDetailMeta {
  cachedAt: string | null;
  fromCache: boolean;
  refreshing: boolean;
}

export interface ProjectDetailResult {
  data: ProjectDetailPayload;
  meta: ProjectDetailMeta;
}

interface DetailCacheFile {
  version?: number;
  projectPath: string;
  cachedAt: number;
  data: ProjectDetailPayload;
}

const refreshInFlight = new Set<string>();

function ensureDetailCacheDir(): void {
  if (!fs.existsSync(DETAIL_CACHE_DIR)) {
    fs.mkdirSync(DETAIL_CACHE_DIR, { recursive: true });
  }
}

function cacheFilePath(projectPath: string): string {
  const hash = crypto.createHash('sha256').update(projectPath).digest('hex').slice(0, 24);
  return path.join(DETAIL_CACHE_DIR, `${hash}.json`);
}

function normalizeCommits(
  commits: CommitInfo[] | string[] | undefined
): CommitInfo[] {
  if (!commits?.length) return [];
  if (typeof commits[0] === 'string') {
    return (commits as string[]).map((line) => {
      const space = line.indexOf(' ');
      if (space === -1) {
        return { hash: line, message: '', author: '', date: '' };
      }
      return {
        hash: line.slice(0, space),
        message: line.slice(space + 1).trim(),
        author: '',
        date: '',
      };
    });
  }
  return commits as CommitInfo[];
}

/** 旧版 --oneline 解析 bug：仅 1 条且 message 为空 */
function isBrokenCommitCache(commits: CommitInfo[] | string[] | undefined): boolean {
  const normalized = normalizeCommits(commits);
  if (normalized.length === 0) return false;
  if (normalized.length === 1 && !normalized[0].message) return true;
  return normalized.length > 0 && normalized.every((c) => !c.message);
}

function reviveDetail(data: ProjectDetailPayload): ProjectDetailPayload {
  return {
    ...data,
    lastModified: new Date(data.lastModified),
    commits: normalizeCommits(data.commits as CommitInfo[] | string[]),
  };
}

function readDetailCache(projectPath: string): DetailCacheFile | null {
  try {
    const file = cacheFilePath(projectPath);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as DetailCacheFile;
    if (parsed.projectPath !== projectPath) return null;
    if ((parsed.version ?? 1) < DETAIL_CACHE_VERSION) return null;
    if (isBrokenCommitCache(parsed.data.commits)) return null;
    return {
      ...parsed,
      data: reviveDetail(parsed.data),
    };
  } catch {
    return null;
  }
}

function writeDetailCache(projectPath: string, data: ProjectDetailPayload): void {
  ensureDetailCacheDir();
  const file = cacheFilePath(projectPath);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        version: DETAIL_CACHE_VERSION,
        projectPath,
        cachedAt: Date.now(),
        data,
      } satisfies DetailCacheFile,
      null,
      2
    ),
    'utf-8'
  );
}

export function invalidateProjectDetail(projectPath: string): void {
  try {
    const file = cacheFilePath(projectPath);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch {
    // ignore
  }
}

export function clearProjectDetailCache(): void {
  try {
    if (fs.existsSync(DETAIL_CACHE_DIR)) {
      for (const name of fs.readdirSync(DETAIL_CACHE_DIR)) {
        fs.unlinkSync(path.join(DETAIL_CACHE_DIR, name));
      }
    }
  } catch {
    // ignore
  }
}

function mergeBasicProjectFields(
  cached: ProjectDetailPayload,
  project: Project
): ProjectDetailPayload {
  return {
    ...cached,
    name: project.name,
    path: project.path,
    isGit: project.isGit,
    branch: project.branch,
    remote: project.remote,
    status: project.status,
    uncommittedChanges: project.uncommittedChanges,
    ahead: project.ahead,
    behind: project.behind,
    lastModified: project.lastModified,
    packageManager: project.packageManager,
    nodeVersion: project.nodeVersion,
    hasPackageJson: project.hasPackageJson,
    tags: project.tags ?? cached.tags,
  };
}

export async function fetchProjectDetail(project: Project): Promise<ProjectDetailPayload> {
  const [branches, commits, size, deps, outdated] = await Promise.all([
    project.isGit ? getBranches(project.path) : Promise.resolve([]),
    project.isGit ? getRecentCommits(project.path, 20) : Promise.resolve([]),
    getProjectSize(project.path),
    getDependencyInfo(project.path),
    project.packageManager
      ? getOutdatedPackages(project.path, project.packageManager)
      : Promise.resolve([]),
  ]);

  return {
    ...project,
    branches,
    commits,
    size,
    dependencies: deps,
    outdatedPackages: outdated,
  };
}

async function refreshDetailInBackground(project: Project): Promise<void> {
  if (refreshInFlight.has(project.path)) return;
  refreshInFlight.add(project.path);
  try {
    const data = await fetchProjectDetail(project);
    writeDetailCache(project.path, data);
  } catch (error) {
    console.warn(
      `[project-detail] 后台刷新失败 ${project.name}:`,
      (error as Error).message
    );
  } finally {
    refreshInFlight.delete(project.path);
  }
}

export async function getProjectDetail(
  project: Project,
  options?: { refresh?: boolean }
): Promise<ProjectDetailResult> {
  if (!options?.refresh) {
    const cached = readDetailCache(project.path);
    if (cached) {
      const age = Date.now() - cached.cachedAt;
      const stale = age >= DETAIL_TTL_MS;
      const data = mergeBasicProjectFields(cached.data, project);

      if (stale) {
        void refreshDetailInBackground(project);
      }

      return {
        data,
        meta: {
          cachedAt: new Date(cached.cachedAt).toISOString(),
          fromCache: true,
          refreshing: stale,
        },
      };
    }
  }

  const data = await fetchProjectDetail(project);
  writeDetailCache(project.path, data);

  return {
    data,
    meta: {
      cachedAt: new Date().toISOString(),
      fromCache: false,
      refreshing: false,
    },
  };
}
