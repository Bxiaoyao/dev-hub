import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import { getProjects } from '../../core/project-store.js';
import { exportProjectsToFile, exportProjectsToContent } from '../../core/export.js';

export const exportRouter = Router();

// Export projects（Web 默认返回 YAML 内容供下载）
exportRouter.post('/', async (req, res) => {
  try {
    const { projectIds, outputPath } = req.body;

    const config = await initConfig();
    let { projects } = await getProjects(config);

    if (projectIds && projectIds.length > 0) {
      projects = projects.filter(
        (p) => projectIds.includes(p.name) || projectIds.includes(p.path)
      );
    }

    if (outputPath) {
      const result = await exportProjectsToFile(projects, outputPath);
      res.json(result);
      return;
    }

    const result = exportProjectsToContent(projects);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
