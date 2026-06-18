import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import type { ExportData, ExportedProject, Config } from '../types/index.js';
import { cloneRepo, checkoutBranch, fetchAll } from './git.js';
import { initConfig } from '../utils/config.js';

export interface ImportResult {
  project: string;
  success: boolean;
  error?: string;
  cloned?: boolean;
  updated?: boolean;
  hookRun?: boolean;
}

export async function importFromExport(
  exportData: ExportData,
  targetDir: string,
  options: {
    skipHooks?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<ImportResult[]> {
  const config = await initConfig();
  await fs.mkdir(targetDir, { recursive: true });

  const results: ImportResult[] = [];

  for (const project of exportData.projects) {
    const projectDir = path.join(targetDir, project.name);
    const result = await importProject(project, projectDir, config, options);
    results.push(result);
  }

  return results;
}

async function importProject(
  project: ExportedProject,
  projectDir: string,
  config: Config,
  options: {
    skipHooks?: boolean;
    dryRun?: boolean;
  }
): Promise<ImportResult> {
  if (!project.git) {
    return {
      project: project.name,
      success: false,
      error: '缺少 git 远程地址',
    };
  }

  if (options.dryRun) {
    return {
      project: project.name,
      success: true,
      cloned: false,
      hookRun: false,
    };
  }

  const exists = await pathExists(projectDir);

  if (exists) {
    const gitDir = path.join(projectDir, '.git');
    const isGit = await pathExists(gitDir);
    if (!isGit) {
      return {
        project: project.name,
        success: false,
        error: `目录已存在且不是 Git 仓库: ${projectDir}`,
      };
    }

    await fetchAll(projectDir, config);

    if (project.branch) {
      const checkout = await checkoutBranch(projectDir, project.branch);
      if (!checkout.success) {
        return {
          project: project.name,
          success: false,
          error: checkout.error || `无法切换到分支 ${project.branch}`,
          updated: false,
        };
      }
    }

    const hookResult = await runAfterCloneHooks(project, projectDir, config, options.skipHooks);
    if (!hookResult.success) {
      return { project: project.name, success: false, error: hookResult.error, updated: true };
    }

    return {
      project: project.name,
      success: true,
      cloned: false,
      updated: true,
      hookRun: hookResult.ran,
    };
  }

  const cloneResult = await cloneRepo(project.git, projectDir, config, project.branch);
  if (!cloneResult.success) {
    return {
      project: project.name,
      success: false,
      error: cloneResult.error,
    };
  }

  const hookResult = await runAfterCloneHooks(project, projectDir, config, options.skipHooks);
  if (!hookResult.success) {
    return { project: project.name, success: false, error: hookResult.error, cloned: true };
  }

  return {
    project: project.name,
    success: true,
    cloned: true,
    hookRun: hookResult.ran,
  };
}

async function runAfterCloneHooks(
  project: ExportedProject,
  projectDir: string,
  config: Config,
  skipHooks?: boolean
): Promise<{ success: boolean; error?: string; ran: boolean }> {
  if (skipHooks) return { success: true, ran: false };

  const hooks = project.hooks?.afterClone || config.hooks.afterClone;
  if (!hooks.length) return { success: true, ran: false };

  for (const hook of hooks) {
    const resolvedHook = hook
      .replace('{packageManager}', project.packageManager || 'npm')
      .replace('{projectDir}', projectDir)
      .replace('{branch}', project.branch || '');

    try {
      await execa(resolvedHook, [], { cwd: projectDir, shell: true });
    } catch {
      return { success: false, error: `Hook 执行失败: ${hook}`, ran: true };
    }
  }

  return { success: true, ran: true };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
