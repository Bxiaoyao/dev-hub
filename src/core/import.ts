import path from 'path';
import { execa } from 'execa';
import type { ExportData, ExportedProject, Config } from '../types/index';
import { cloneRepo } from './git.js';
import { loadConfig, getConfigDir } from '../utils/config.js';

export interface ImportResult {
  project: string;
  success: boolean;
  error?: string;
  cloned?: boolean;
  hookRun?: boolean;
}

export async function importFromExport(
  exportData: ExportData,
  targetDir: string,
  options: {
    skipHooks?: boolean;
    parallel?: number;
    dryRun?: boolean;
  }
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  const config = await loadConfig();

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
  // Dry run - just report what would happen
  if (options.dryRun) {
    return {
      project: project.name,
      success: true,
      cloned: false,
      hookRun: false,
    };
  }

  // Clone if git URL exists
  if (project.git) {
    const cloneResult = await cloneRepo(project.git, projectDir);
    if (!cloneResult.success) {
      return {
        project: project.name,
        success: false,
        error: cloneResult.error,
      };
    }

    // Checkout branch if specified
    if (project.branch) {
      try {
        await execa('git', ['checkout', project.branch], { cwd: projectDir });
      } catch {
        // Branch might not exist, that's okay
      }
    }
  }

  // Run hooks
  if (!options.skipHooks) {
    const hooks = project.hooks?.afterClone || config.hooks.afterClone;
    for (const hook of hooks) {
      const resolvedHook = resolveHookVariables(hook, {
        projectDir,
        packageManager: project.packageManager || 'npm',
        branch: project.branch,
      });

      try {
        await execa(resolvedHook, [], {
          cwd: projectDir,
          shell: true,
        });
      } catch (error) {
        return {
          project: project.name,
          success: false,
          error: `Hook failed: ${hook}`,
        };
      }
    }
  }

  return {
    project: project.name,
    success: true,
    cloned: true,
    hookRun: !options.skipHooks,
  };
}

function resolveHookVariables(
  hook: string,
  variables: {
    projectDir: string;
    packageManager: string;
    branch?: string;
  }
): string {
  return hook
    .replace('{packageManager}', variables.packageManager)
    .replace('{projectDir}', variables.projectDir)
    .replace('{branch}', variables.branch || '');
}