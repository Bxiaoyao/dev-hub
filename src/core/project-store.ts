import { scanProjects } from './scanner.js';
import {
  cacheProjects,
  getCachedProjects,
  getCacheAge,
} from '../utils/cache.js';
import type { Config, Project } from '../types/index.js';

export interface ProjectsListMeta {
  cachedAt: string | null;
  fromCache: boolean;
  refreshing: boolean;
}

export interface ProjectsListResult {
  projects: Project[];
  meta: ProjectsListMeta;
}

const BACKGROUND_INTERVAL_MS = Number(process.env.DEVHUB_SCAN_INTERVAL_MS) || 10 * 60 * 1000;

let refreshPromise: Promise<Project[]> | null = null;
let backgroundTimer: ReturnType<typeof setInterval> | null = null;
let isBackgroundRefreshing = false;

async function runScan(config: Config): Promise<Project[]> {
  const projects = await scanProjects(config);
  cacheProjects(projects);
  return projects;
}

/** 全量扫描并更新缓存（并发请求会复用同一次扫描） */
export async function refreshProjects(config: Config): Promise<Project[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = runScan(config).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function buildMeta(fromCache: boolean): ProjectsListMeta {
  const cachedAt = getCacheAge();
  return {
    cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
    fromCache,
    refreshing: isBackgroundRefreshing || refreshPromise !== null,
  };
}

/**
 * 获取项目列表：默认读缓存；无缓存时阻塞扫描一次。
 * refresh=true 时强制全量扫描。
 */
export async function getProjects(
  config: Config,
  options?: { refresh?: boolean }
): Promise<ProjectsListResult> {
  if (options?.refresh) {
    const projects = await refreshProjects(config);
    return { projects, meta: buildMeta(false) };
  }

  const cached = getCachedProjects();
  if (cached.length > 0) {
    return { projects: cached, meta: buildMeta(true) };
  }

  const projects = await refreshProjects(config);
  return { projects, meta: buildMeta(false) };
}

/** 按名称或路径查找项目（优先缓存，避免每次操作都全量扫描） */
export async function findProject(
  config: Config,
  id: string
): Promise<Project | undefined> {
  const { projects } = await getProjects(config);
  return projects.find((p) => p.name === id || p.path === id);
}

export function startBackgroundRefresh(
  getConfig: () => Promise<Config>,
  intervalMs: number = BACKGROUND_INTERVAL_MS
): void {
  if (backgroundTimer) return;

  const tick = async () => {
    if (refreshPromise) return;
    isBackgroundRefreshing = true;
    try {
      const config = await getConfig();
      await refreshProjects(config);
    } catch (error) {
      console.warn('[project-store] 后台刷新失败:', (error as Error).message);
    } finally {
      isBackgroundRefreshing = false;
    }
  };

  backgroundTimer = setInterval(() => {
    void tick();
  }, intervalMs);

  // 启动后延迟 30s 做首次后台刷新（有缓存时用户已可秒开列表）
  setTimeout(() => {
    void tick();
  }, 30_000);
}

/** 服务启动时：有缓存则跳过，无缓存则后台预热 */
export function warmupProjectsCache(getConfig: () => Promise<Config>): void {
  if (getCachedProjects().length > 0) return;

  void (async () => {
    try {
      const config = await getConfig();
      await refreshProjects(config);
      console.log('[project-store] 项目缓存预热完成');
    } catch (error) {
      console.warn('[project-store] 缓存预热失败:', (error as Error).message);
    }
  })();
}

export function applyProjectFilters(
  projects: Project[],
  query: { filter?: string; sort?: string; search?: string }
): Project[] {
  let filtered = projects;

  if (query.search) {
    const q = query.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q)
    );
  }

  if (query.filter === 'git') {
    filtered = filtered.filter((p) => p.isGit);
  } else if (query.filter === 'recent') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    filtered = filtered.filter((p) => p.lastModified >= oneWeekAgo);
  } else if (query.filter === 'dirty') {
    filtered = filtered.filter((p) => p.status === 'dirty');
  }

  if (query.sort === 'name') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (query.sort === 'branch') {
    filtered = [...filtered].sort((a, b) =>
      (a.branch || '').localeCompare(b.branch || '')
    );
  } else if (query.sort === 'path') {
    filtered = [...filtered].sort((a, b) => a.path.localeCompare(b.path));
  }

  return filtered;
}
