import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import {
  applyProjectFilters,
  findProject,
  getProjects,
  refreshProjects,
} from '../../core/project-store.js';
import { getProjectSize, cleanDirectory } from '../../core/size.js';
import { openInEditor, getEditor } from '../../core/editor.js';
import { openTerminal } from '../../core/terminal.js';
import { revealInFileManager } from '../../core/reveal.js';
import { getCacheAge } from '../../utils/cache.js';
import { setProjectTags } from '../../core/project-meta.js';
import { getProjectDetail, invalidateProjectDetail } from '../../core/project-detail-store.js';
import path from 'path';

export const projectsRouter = Router();

function parseListQuery(req: { query: Record<string, unknown> }) {
  const { filter, sort, search, refresh, tag } = req.query;
  return {
    filter: typeof filter === 'string' ? filter : undefined,
    sort: typeof sort === 'string' ? sort : undefined,
    search: typeof search === 'string' ? search : undefined,
    tag: typeof tag === 'string' ? tag : undefined,
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

// Update project tags
projectsRouter.patch('/:id/tags', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'tags 必须是字符串数组' });
      return;
    }

    const normalized = await setProjectTags(
      project.path,
      tags.filter((t): t is string => typeof t === 'string')
    );

    invalidateProjectDetail(project.path);

    res.json({ success: true, tags: normalized });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get single project（默认走详情缓存，refresh=true 强制刷新）
projectsRouter.get('/:id', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const { data, meta } = await getProjectDetail(project, { refresh });

    res.json({ ...data, meta });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 在系统文件管理器中显示项目目录
projectsRouter.post('/:id/reveal', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await revealInFileManager(project.path);
    res.json(result);
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

    const { editor, file } = req.body;
    const resolvedEditor = editor || (await getEditor(config));

    const result = await openInEditor(project.path, resolvedEditor, file);

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

// 清理项目内可删除目录（如 node_modules）
projectsRouter.post('/:id/size/clean', async (req, res) => {
  try {
    const config = await initConfig();
    const project = await findProject(config, req.params.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const { dirName } = req.body;
    if (!dirName || typeof dirName !== 'string') {
      res.status(400).json({ error: '请提供 dirName' });
      return;
    }

    const safeName = path.basename(dirName);
    const result = await cleanDirectory(project.path, safeName);
    if (result.success) {
      invalidateProjectDetail(project.path);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
