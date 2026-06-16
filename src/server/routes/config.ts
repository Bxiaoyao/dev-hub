import { Router } from 'express';
import { loadConfig, saveConfig, initConfig } from '../../utils/config.js';

export const configRouter = Router();

// Get config
configRouter.get('/', async (req, res) => {
  try {
    const config = await initConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update config
configRouter.put('/', async (req, res) => {
  try {
    const config = await loadConfig();
    const updated = { ...config, ...req.body };
    await saveConfig(updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});