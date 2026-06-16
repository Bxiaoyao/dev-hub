import { Router } from 'express';
import { loadExportFile } from '../../core/export.js';
import { importFromExport } from '../../core/import.js';

export const importRouter = Router();

// Import projects
importRouter.post('/', async (req, res) => {
  try {
    const { file, targetDir, skipHooks, parallel, dryRun } = req.body;

    const loadResult = await loadExportFile(file);

    if (!loadResult.success || !loadResult.data) {
      res.status(400).json({ error: loadResult.error });
      return;
    }

    const results = await importFromExport(loadResult.data, targetDir || process.cwd(), {
      skipHooks,
      parallel: parallel || 3,
      dryRun,
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});