const API_BASE = '/api';

export async function api<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `API Error (${response.status})`;
    try {
      const error = JSON.parse(text) as { error?: string };
      message = error.error || message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  return response.json();
}

export interface ProjectsListMeta {
  cachedAt: string | null;
  fromCache: boolean;
  refreshing: boolean;
  tagPresets?: string[];
}

export interface ProjectsListResponse {
  projects: import('./types').Project[];
  meta: ProjectsListMeta;
}

const DEFAULT_LIST_META: ProjectsListMeta = {
  cachedAt: null,
  fromCache: false,
  refreshing: false,
};

function normalizeProjectsResponse(
  raw: ProjectsListResponse | import('./types').Project[]
): ProjectsListResponse {
  if (Array.isArray(raw)) {
    return { projects: raw, meta: DEFAULT_LIST_META };
  }
  return {
    projects: Array.isArray(raw?.projects) ? raw.projects : [],
    meta: raw?.meta ?? DEFAULT_LIST_META,
  };
}

export const apiClient = {
  // Projects
  getProjects: async (params?: {
    filter?: string;
    sort?: string;
    search?: string;
    tag?: string;
    refresh?: boolean;
  }): Promise<ProjectsListResponse> => {
    const query = new URLSearchParams();
    if (params?.filter) query.set('filter', params.filter);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.search) query.set('search', params.search);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.refresh) query.set('refresh', 'true');
    const queryString = query.toString();
    const raw = await api<ProjectsListResponse | import('./types').Project[]>(
      `/projects${queryString ? `?${queryString}` : ''}`
    );
    return normalizeProjectsResponse(raw);
  },

  scanProjects: () =>
    api<{ success: boolean; count: number; cachedAt: string | null }>('/projects/scan', {
      method: 'POST',
    }),

  getProject: (id: string, options?: { refresh?: boolean }) => {
    const query = options?.refresh ? '?refresh=true' : '';
    return api<import('./types').ProjectDetailResponse>(
      `/projects/${encodeURIComponent(id)}${query}`
    );
  },

  openProject: (id: string, editor?: string, file?: string) =>
    api(`/projects/${encodeURIComponent(id)}/open`, {
      method: 'POST',
      body: JSON.stringify({ editor, file }),
    }),

  revealInFinder: (id: string) =>
    api(`/projects/${encodeURIComponent(id)}/reveal`, { method: 'POST' }),

  cleanProjectDir: (id: string, dirName: string) =>
    api<{ success: boolean; error?: string; freedBytes?: number }>(
      `/projects/${encodeURIComponent(id)}/size/clean`,
      {
        method: 'POST',
        body: JSON.stringify({ dirName }),
      }
    ),

  createBranch: (projectId: string, name: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/branch`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  openTerminal: (id: string) =>
    api(`/projects/${encodeURIComponent(id)}/terminal`, { method: 'POST' }),

  getProjectSize: (id: string) =>
    api(`/projects/${encodeURIComponent(id)}/size`),

  setProjectTags: (id: string, tags: string[]) =>
    api<{ success: boolean; tags: string[] }>(
      `/projects/${encodeURIComponent(id)}/tags`,
      {
        method: 'PATCH',
        body: JSON.stringify({ tags }),
      }
    ),

  getDevServerStatus: (id: string) =>
    api<import('./types').DevServerStatus & { devScript?: string | null }>(
      `/projects/${encodeURIComponent(id)}/dev`
    ),

  getBatchDevServerStatus: (paths: string[]) =>
    api<{ statuses: Record<string, import('./types').DevServerStatus> }>(
      '/projects/dev-status',
      {
        method: 'POST',
        body: JSON.stringify({ paths }),
      }
    ),

  startDevServer: (id: string, options?: { script?: string; port?: number }) =>
    api<import('./types').DevServerStatus & { success: boolean }>(
      `/projects/${encodeURIComponent(id)}/dev/start`,
      {
        method: 'POST',
        body: JSON.stringify(options ?? {}),
      }
    ),

  stopDevServer: (id: string) =>
    api<import('./types').DevServerStatus & { success: boolean }>(
      `/projects/${encodeURIComponent(id)}/dev/stop`,
      { method: 'POST' }
    ),

  // Git
  gitPull: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/pull`, { method: 'POST' }),

  gitFetch: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/fetch`, { method: 'POST' }),

  gitStash: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/stash`, { method: 'POST' }),

  gitStashPop: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/stash-pop`, { method: 'POST' }),

  gitCheckout: (projectId: string, branch: string, stash?: boolean) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/checkout`, {
      method: 'POST',
      body: JSON.stringify({ branch, stash }),
    }),

  createPR: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/git/pr`, { method: 'POST' }),

  // Dependencies
  installDeps: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/deps/install`, { method: 'POST' }),

  upgradePackage: (projectId: string, packageName: string, version?: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/deps/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ packageName, version }),
    }),

  getOutdated: (projectId: string) =>
    api(`/projects/${encodeURIComponent(projectId)}/deps/outdated`),

  // Batch
  startBatch: (
    action: string,
    projectIds: string[],
    packageName?: string,
    packageVersion?: string,
    branchName?: string,
    commitMessage?: string
  ) =>
    api('/batch', {
      method: 'POST',
      body: JSON.stringify({ action, projectIds, packageName, packageVersion, branchName, commitMessage }),
    }),

  getBatchStatus: (jobId: string) => api(`/batch/${jobId}`),

  // Config
  getConfig: () => api('/config'),
  updateConfig: (config: any) =>
    api('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  // Export/Import
  exportProjects: (projectIds: string[], outputPath?: string) =>
    api<{
      success: boolean;
      content?: string;
      filename?: string;
      count?: number;
      skipped?: number;
      path?: string;
      error?: string;
    }>('/export', {
      method: 'POST',
      body: JSON.stringify({ projectIds, outputPath }),
    }),

  importProjects: (options: {
    content?: string;
    file?: string;
    targetDir?: string;
    skipHooks?: boolean;
    dryRun?: boolean;
    branchFallback?: boolean;
  }) =>
    api<ImportResponse>('/import', {
      method: 'POST',
      body: JSON.stringify(options),
    }),
};

export interface ImportResultItem {
  project: string;
  success: boolean;
  error?: string;
  warning?: string;
  branchUsed?: string;
  cloned?: boolean;
  updated?: boolean;
  hookRun?: boolean;
}

export interface ImportResponse {
  results: ImportResultItem[];
  targetDir: string;
  summary: { total: number; success: number; failed: number };
}

export interface ProjectDetailMeta {
  cachedAt: string | null;
  fromCache: boolean;
  refreshing: boolean;
}

export type ProjectDetailResponse = import('./types').Project & {
  branches: { name: string; isCurrent: boolean; isRemote: boolean }[];
  commits: { hash: string; message: string; author: string; date: string }[];
  size: { total: number; breakdown: { name: string; size: number; cleanable: boolean }[] };
  dependencies: {
    name: string;
    version: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } | null;
  outdatedPackages: { name: string; current: string; latest: string }[];
  meta?: ProjectDetailMeta;
};