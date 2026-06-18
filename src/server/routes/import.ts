import { Router } from 'express';
import { parseExportContent, loadExportFile } from '../../core/export.js';
import { importFromExport } from '../../core/import.js';
import os from 'os';
import path from 'path';

export const importRouter = Router();

// Import projects（支持 YAML 内容或服务器本地文件路径）
importRouter.post('/', async (req, res) => {
  try {
    const { file, content, targetDir, skipHooks, dryRun, branchFallback } = req.body;

    let loadResult;
    if (content && typeof content === 'string') {
      loadResult = parseExportContent(content);
    } else if (file && typeof file === 'string') {
      loadResult = await loadExportFile(file);
    } else {
      res.status(400).json({ error: '请提供 content（YAML 内容）或 file（文件路径）' });
      return;
    }

    if (!loadResult.success || !loadResult.data) {
      res.status(400).json({ error: loadResult.error || '无法解析导出文件' });
      return;
    }

    const resolvedTarget =
      targetDir?.startsWith('~')
        ? path.join(os.homedir(), targetDir.slice(1))
        : targetDir || path.join(os.homedir(), 'Projects');

    const results = await importFromExport(loadResult.data, resolvedTarget, {
      skipHooks: Boolean(skipHooks),
      dryRun: Boolean(dryRun),
      branchFallback: branchFallback !== false,
    });

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    res.json({
      results,
      targetDir: resolvedTarget,
      summary: { total: results.length, success: successCount, failed: failedCount },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
