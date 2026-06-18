import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import { scanProjects } from '../../core/scanner.js';
import { getProjectSize } from '../../core/size.js';
import { getBranches, getRecentCommits } from '../../core/git.js';
import { getDependencyInfo, getOutdatedPackages } from '../../core/deps.js';
import { openInEditor, getEditor } from '../../core/editor.js';
import { openTerminal } from '../../core/terminal.js';

export const projectsRouter = Router();

// Get all projects
projectsRouter.get('/', async (req, res) => {
  try {
    const config = await initConfig();
    const projects = await scanProjects(config);

    const { filter, sort, search } = req.query;

    let filtered = projects;

    // Search filter
    if (search && typeof search === 'string') {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filter
    if (filter === 'git') {
      filtered = filtered.filter((p) => p.isGit);
    } else if (filter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter((p) => p.lastModified >= oneWeekAgo);
    } else if (filter === 'dirty') {
      filtered = filtered.filter((p) => p.status === 'dirty');
    }

    // Sort
    if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'branch') {
      filtered.sort((a, b) => (a.branch || '').localeCompare(b.branch || ''));
    }
    // 'recent' is default

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single project
projectsRouter.get('/:id', async (req, res) => {
  try {
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === req.params.id || p.path === req.params.id
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Get additional details
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
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === req.params.id || p.path === req.params.id
    );

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
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === req.params.id || p.path === req.params.id
    );

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
    const projects = await scanProjects(config);
    res.json({ success: true, count: projects.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get project size
projectsRouter.get('/:id/size', async (req, res) => {
  try {
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === req.params.id || p.path === req.params.id
    );

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