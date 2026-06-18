import fs from 'fs/promises';
import path from 'path';
import { getConfigDir } from '../utils/config.js';
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

async function loadStore(): Promise<ProjectMetaStore> {
  if (cache) return cache;

  try {
    const content = await fs.readFile(META_FILE(), 'utf-8');
    const parsed = JSON.parse(content) as ProjectMetaStore;
    cache = {
      version: parsed.version ?? 1,
      projects: parsed.projects ?? {},
    };
    return cache;
  } catch {
    cache = { ...EMPTY_STORE };
    return cache;
  }
}

async function saveStore(store: ProjectMetaStore): Promise<void> {
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
  return store.projects[projectPath]?.tags ?? [];
}

export async function setProjectTags(
  projectPath: string,
  tags: string[]
): Promise<string[]> {
  const store = await loadStore();
  const normalized = normalizeTags(tags);

  if (normalized.length === 0) {
    delete store.projects[projectPath];
  } else {
    store.projects[projectPath] = { tags: normalized };
  }

  await saveStore(store);
  return normalized;
}

export async function attachTagsToProjects(projects: Project[]): Promise<Project[]> {
  const store = await loadStore();
  return projects.map((p) => ({
    ...p,
    tags: store.projects[p.path]?.tags ?? [],
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
