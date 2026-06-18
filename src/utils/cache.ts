import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Project } from '../types/index.js';

const CACHE_DIR = path.join(os.homedir(), '.devhub', 'cache');
const PROJECTS_CACHE_FILE = path.join(CACHE_DIR, 'projects.json');
const OPERATIONS_CACHE_FILE = path.join(CACHE_DIR, 'operations.json');

interface ProjectsCacheFile {
  cachedAt: number;
  projects: Project[];
}

interface OperationRecord {
  projectPath: string;
  action: string;
  success: boolean;
  message?: string;
  timestamp: number;
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function readProjectsCache(): ProjectsCacheFile | null {
  try {
    if (!fs.existsSync(PROJECTS_CACHE_FILE)) return null;
    const raw = fs.readFileSync(PROJECTS_CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw) as ProjectsCacheFile;
    return {
      cachedAt: data.cachedAt,
      projects: data.projects.map((p) => ({
        ...p,
        lastModified: new Date(p.lastModified),
      })),
    };
  } catch {
    return null;
  }
}

function writeProjectsCache(data: ProjectsCacheFile): void {
  ensureCacheDir();
  fs.writeFileSync(PROJECTS_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readOperations(): OperationRecord[] {
  try {
    if (!fs.existsSync(OPERATIONS_CACHE_FILE)) return [];
    const raw = fs.readFileSync(OPERATIONS_CACHE_FILE, 'utf-8');
    return JSON.parse(raw) as OperationRecord[];
  } catch {
    return [];
  }
}

function writeOperations(records: OperationRecord[]): void {
  ensureCacheDir();
  fs.writeFileSync(OPERATIONS_CACHE_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export function cacheProjects(projects: Project[]): void {
  writeProjectsCache({
    cachedAt: Date.now(),
    projects,
  });
}

export function getCachedProjects(): Project[] {
  const cache = readProjectsCache();
  if (!cache) return [];
  return [...cache.projects].sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
  );
}

export function getCacheAge(): number | null {
  const cache = readProjectsCache();
  return cache?.cachedAt ?? null;
}

export function isCacheValid(maxAgeMs: number = 5 * 60 * 1000): boolean {
  const cachedAt = getCacheAge();
  if (!cachedAt) return false;
  return Date.now() - cachedAt < maxAgeMs;
}

export function clearCache(): void {
  if (fs.existsSync(PROJECTS_CACHE_FILE)) {
    fs.unlinkSync(PROJECTS_CACHE_FILE);
  }
}

export function recordOperation(
  projectPath: string,
  action: string,
  success: boolean,
  message?: string
): void {
  const records = readOperations();
  records.unshift({
    projectPath,
    action,
    success,
    message,
    timestamp: Date.now(),
  });
  writeOperations(records.slice(0, 200));
}

export function getRecentOperations(limit: number = 50): {
  projectPath: string;
  action: string;
  success: boolean;
  message?: string;
  timestamp: Date;
}[] {
  return readOperations().slice(0, limit).map((row) => ({
    projectPath: row.projectPath,
    action: row.action,
    success: row.success,
    message: row.message,
    timestamp: new Date(row.timestamp),
  }));
}

export function closeDb(): void {
  // JSON 文件缓存无需关闭连接
}
