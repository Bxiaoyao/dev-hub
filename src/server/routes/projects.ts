import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import {
  applyProjectFilters,
  findProject,
  getProjects,
  refreshProjects,
} from '../../core/project-store.js';
import { getProjectSize } from '../../core/size.js';
import { getBranches, getRecentCommits } from '../../core/git.js';
import { getDependencyInfo, getOutdatedPackages } from '../../core/deps.js';
import { openInEditor, getEditor } from '../../core/editor.js';
import { openTerminal } from '../../core/terminal.js';
import { getCacheAge } from '../../utils/cache.js';

export const projectsRouter = Router();

function parseListQuery(req: { query: Record<string, unknown> }) {
  const { filter, sort, search, refresh } = req.query;
  return {
    filter: typeof filter === 'string' ? filter : undefined,
    sort: typeof sort === 'string' ? sort : undefined,
    search: typeof search === 'string' ? search : undefined,
    refresh: refresh === 'true' || refresh === '1',
  };
}

// Get all projects（默认走缓存）
projectsRouter.get('/', async (req, res) => {
  try {
    const config = await initConfig();
    const query = parseListQuery(req);
    const { projects, meta } = await getProjects(config, {
      refresh: query.refresh,
    });
    const filtered = applyProjectFilters(projects, query);

    res.json({
      projects: filtered,
      meta,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single project
projectsRouter.get('/:id', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const [branches, commits, size, deps, outdated] = await Promise.all([
      project.isGit ? getBranches(project.path) : Promise.resolve([]),
      project.isGit ? getRecentCommits(project.path, 20) : Promise.resolve([]),
      getProjectSize(project.path),
      getDependencyInfo(project.path),
      project.packageManager
        ? getOutdatedPackages(project.path, project.packageManager)
        : Promise.resolve([]),
    ]);

    res.json({
      ...project,
      branches,
      commits,
      size,
      dependencies: deps,
      outdatedPackages: outdated,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Open project in editor
projectsRouter.post('/:id/open', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const { editor } = req.body;
    const resolvedEditor = editor || (await getEditor(config));

    const result = await openInEditor(project.path, resolvedEditor);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Open terminal
projectsRouter.post('/:id/terminal', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await openTerminal(project.path, config.terminal.default);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Scan for projects (force rescan)
projectsRouter.post('/scan', async (req, res) => {
  try {
    const config = await initConfig();
    const projects = await refreshProjects(config);
    const cachedAt = getCacheAge();
    res.json({
      success: true,
      count: projects.length,
      cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get project size
projectsRouter.get('/:id/size', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const size = await getProjectSize(project.path);
    res.json(size);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
