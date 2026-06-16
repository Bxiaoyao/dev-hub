import { Router } from 'express';
import { projectsRouter } from './routes/projects.js';
import { gitRouter } from './routes/git.js';
import { depsRouter } from './routes/deps.js';
import { batchRouter } from './routes/batch.js';
import { exportRouter } from './routes/export.js';
import { importRouter } from './routes/import.js';
import { configRouter } from './routes/config.js';

export function createApiRouter(): Router {
  const router = Router();

  router.use('/projects', projectsRouter);
  router.use('/config', configRouter);
  router.use('/export', exportRouter);
  router.use('/import', importRouter);
  router.use('/batch', batchRouter);

  // Project-specific routes (mergeParams allows access to :projectId)
  router.use('/projects/:projectId/git', gitRouter);
  router.use('/projects/:projectId/deps', depsRouter);

  return router;
}