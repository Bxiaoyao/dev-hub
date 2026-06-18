import fs from 'fs/promises';
import path from 'path';
import { ensureConfigDir, getConfigDir } from '../utils/config.js';
import { normalizeProjectPath } from '../utils/project-path.js';
import type { Project } from '../types/index.js';

const META_FILE = () => path.join(getConfigDir(), 'project-meta.json');

interface ProjectMetaEntry {
  tags?: string[];
}

interface ProjectMetaStore {
  version: number;
  projects: Record<string, ProjectMetaEntry>;
}

const EMPTY_STORE: ProjectMetaStore = { version: 1, projects: {} };

let cache: ProjectMetaStore | null = null;

function lookupTags(
  store: ProjectMetaStore,
  projectPath: string
): string[] | undefined {
  const key = normalizeProjectPath(projectPath);
  if (store.projects[key]?.tags) {
    return store.projects[key].tags;
  }

  // 兼容旧数据：混合斜杠或未规范化的 key
  for (const [storedKey, entry] of Object.entries(store.projects)) {
    if (normalizeProjectPath(storedKey) === key) {
      return entry.tags;
    }
  }

  return undefined;
}

function migrateStoreKeys(store: ProjectMetaStore): boolean {
  let changed = false;
  const migrated: Record<string, ProjectMetaEntry> = {};

  for (const [rawKey, entry] of Object.entries(store.projects)) {
    const key = normalizeProjectPath(rawKey);
    if (key !== rawKey) changed = true;

    if (!migrated[key]) {
      migrated[key] = entry;
      continue;
    }

    const merged = new Set([
      ...(migrated[key].tags ?? []),
      ...(entry.tags ?? []),
    ]);
    migrated[key] = { tags: [...merged] };
    changed = true;
  }

  if (changed) {
    store.projects = migrated;
  }

  return changed;
}

async function loadStore(): Promise<ProjectMetaStore> {
  if (cache) return cache;

  try {
    const content = await fs.readFile(META_FILE(), 'utf-8');
    const parsed = JSON.parse(content) as ProjectMetaStore;
    const store: ProjectMetaStore = {
      version: parsed.version ?? 1,
      projects: parsed.projects ?? {},
    };

    if (migrateStoreKeys(store)) {
      await saveStore(store);
    } else {
      cache = store;
    }

    return cache ?? store;
  } catch {
    cache = { ...EMPTY_STORE };
    return cache;
  }
}

async function saveStore(store: ProjectMetaStore): Promise<void> {
  await ensureConfigDir();
  cache = store;
  await fs.writeFile(META_FILE(), JSON.stringify(store, null, 2), 'utf-8');
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

export async function getProjectTags(projectPath: string): Promise<string[]> {
  const store = await loadStore();
  return lookupTags(store, projectPath) ?? [];
}

export async function setProjectTags(
  projectPath: string,
  tags: string[]
): Promise<string[]> {
  const store = await loadStore();
  const key = normalizeProjectPath(projectPath);
  const normalized = normalizeTags(tags);

  if (normalized.length === 0) {
    delete store.projects[key];
    for (const storedKey of Object.keys(store.projects)) {
      if (normalizeProjectPath(storedKey) === key) {
        delete store.projects[storedKey];
      }
    }
  } else {
    for (const storedKey of Object.keys(store.projects)) {
      if (storedKey !== key && normalizeProjectPath(storedKey) === key) {
        delete store.projects[storedKey];
      }
    }
    store.projects[key] = { tags: normalized };
  }

  await saveStore(store);
  return normalized;
}

export async function attachTagsToProjects(projects: Project[]): Promise<Project[]> {
  const store = await loadStore();
  return projects.map((p) => ({
    ...p,
    tags: lookupTags(store, p.path) ?? [],
  }));
}

export async function collectAllUsedTags(): Promise<string[]> {
  const store = await loadStore();
  const seen = new Set<string>();
  for (const entry of Object.values(store.projects)) {
    for (const tag of entry.tags ?? []) {
      seen.add(tag);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
