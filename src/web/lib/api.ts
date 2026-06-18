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
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return response.json();
}

export interface ProjectsListMeta {
  cachedAt: string | null;
  fromCache: boolean;
  refreshing: boolean;
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
    refresh?: boolean;
  }): Promise<ProjectsListResponse> => {
    const query = new URLSearchParams();
    if (params?.filter) query.set('filter', params.filter);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.search) query.set('search', params.search);
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

  getProject: (id: string) => api<any>(`/projects/${encodeURIComponent(id)}`),

  openProject: (id: string, editor?: string) =>
    api(`/projects/${encodeURIComponent(id)}/open`, {
      method: 'POST',
      body: JSON.stringify({ editor }),
    }),

  openTerminal: (id: string) =>
    api(`/projects/${encodeURIComponent(id)}/terminal`, { method: 'POST' }),

  getProjectSize: (id: string) =>
    api(`/projects/${encodeURIComponent(id)}/size`),

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
    api('/export', {
      method: 'POST',
      body: JSON.stringify({ projectIds, outputPath }),
    }),

  importProjects: (file: string, targetDir?: string) =>
    api('/import', {
      method: 'POST',
      body: JSON.stringify({ file, targetDir }),
    }),
};