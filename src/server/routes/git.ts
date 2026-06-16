import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import { scanProjects } from '../../core/scanner.js';
import {
  pull,
  fetchAll,
  getRecentCommits,
  checkoutBranch,
  createBranch,
  deleteBranch,
} from '../../core/git.js';
import simpleGit from 'simple-git';

export const gitRouter = Router({ mergeParams: true });

const getProjectId = (req: any) => req.params.projectId;

// Get git status
gitRouter.get('/status', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({
      branch: project.branch,
      status: project.status,
      ahead: project.ahead,
      behind: project.behind,
      uncommittedChanges: project.uncommittedChanges,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Pull
gitRouter.post('/pull', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await pull(project.path);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Fetch
gitRouter.post('/fetch', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await fetchAll(project.path);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stash
gitRouter.post('/stash', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const git = simpleGit(project.path);
    await git.stash();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stash pop
gitRouter.post('/stash-pop', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const git = simpleGit(project.path);
    await git.stash(['pop']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Checkout branch
gitRouter.post('/checkout', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { branch, stash } = req.body;

    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    let result;
    if (stash) {
      const git = simpleGit(project.path);
      await git.stash();
      result = await checkoutBranch(project.path, branch);
    } else {
      result = await checkoutBranch(project.path, branch);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create branch
gitRouter.post('/branch', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { name } = req.body;

    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await createBranch(project.path, name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete branch
gitRouter.delete('/branch/:branchName', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const branchName = req.params.branchName;

    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await deleteBranch(project.path, branchName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create PR
gitRouter.post('/pr', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project || !project.branch || !project.remote) {
      res.status(400).json({ error: 'Project has no remote or branch' });
      return;
    }

    // Convert git URL to HTTPS
    let prUrl = project.remote;
    if (project.remote.startsWith('git@')) {
      prUrl = project.remote
        .replace('git@', 'https://')
        .replace(':', '/')
        .replace('.git', '');
    }
    prUrl = `${prUrl}/pull/new/${project.branch}`;

    // Open in browser
    const { execa } = await import('execa');
    await execa('open', [prUrl]);

    res.json({ success: true, url: prUrl });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get commits
gitRouter.get('/commits', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const count = req.query.count as string | undefined;

    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const commits = await getRecentCommits(
      project.path,
      count ? parseInt(count, 10) : 20
    );
    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});