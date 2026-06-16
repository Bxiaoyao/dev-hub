import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import { scanProjects } from '../../core/scanner.js';
import {
  installDependencies,
  upgradePackage,
  getOutdatedPackages,
  runAudit,
} from '../../core/deps.js';

export const depsRouter = Router({ mergeParams: true });

const getProjectId = (req: any) => req.params.projectId;

// Install dependencies
depsRouter.post('/install', async (req, res) => {
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

    if (!project.packageManager) {
      res.status(400).json({ error: 'No package manager detected' });
      return;
    }

    const result = await installDependencies(project.path, project.packageManager);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get outdated packages
depsRouter.get('/outdated', async (req, res) => {
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

    if (!project.packageManager) {
      res.json([]);
      return;
    }

    const outdated = await getOutdatedPackages(project.path, project.packageManager);
    res.json(outdated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Upgrade package
depsRouter.post('/upgrade', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { packageName, version } = req.body;

    const config = await initConfig();
    const projects = await scanProjects(config);

    const project = projects.find(
      (p) => p.name === projectId || p.path === projectId
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!project.packageManager) {
      res.status(400).json({ error: 'No package manager detected' });
      return;
    }

    const result = await upgradePackage(
      project.path,
      packageName,
      version,
      project.packageManager
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Audit
depsRouter.get('/audit', async (req, res) => {
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

    if (!project.packageManager) {
      res.json({ vulnerabilities: 0 });
      return;
    }

    const result = await runAudit(project.path, project.packageManager);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});