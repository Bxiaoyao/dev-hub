import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import { getProjects } from '../../core/project-store.js';
import { exportProjectsToFile } from '../../core/export.js';

export const exportRouter = Router();

// Export projects
exportRouter.post('/', async (req, res) => {
  try {
    const { projectIds, outputPath, includeHooks } = req.body;

    const config = await initConfig();
    let { projects } = await getProjects(config);

    if (projectIds && projectIds.length > 0) {
      projects = projects.filter(
        (p) => projectIds.includes(p.name) || projectIds.includes(p.path)
      );
    }

    const result = await exportProjectsToFile(
      projects,
      outputPath || 'devhub-projects.yaml'
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});