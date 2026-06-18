import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './router.js';
import { initConfig } from '../utils/config.js';
import {
  startBackgroundRefresh,
  warmupProjectsCache,
} from '../core/project-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer(options: {
  port?: number;
  open?: boolean;
}): Promise<void> {
  const port = options.port || 3200;
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API routes
  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);

  // Static files (served from dist/web in production)
  const webDistPath = path.join(__dirname, '../../dist/web');
  app.use(express.static(webDistPath));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  // Start server
  app.listen(port, () => {
    console.log(`DevHub server running at http://localhost:${port}`);

    warmupProjectsCache(initConfig);
    startBackgroundRefresh(initConfig);

    if (options.open) {
      import('open').then((open) => {
        open.default(`http://localhost:${port}`);
      });
    }
  });
}