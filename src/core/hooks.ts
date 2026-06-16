import { execa } from 'execa';
import type { Config } from '../types';
import { loadConfig } from '../utils/config';

export type HookEvent =
  | 'afterClone'
  | 'afterBranchSwitch'
  | 'beforeClean'
  | 'afterImport'
  | 'beforeBatch'
  | 'afterBatch';

export interface HookContext {
  projectPath: string;
  packageManager: string;
  branch?: string;
  projectName?: string;
}

export async function runHook(
  event: HookEvent,
  context: HookContext,
  projectHooks?: Record<string, string[]>
): Promise<{ success: boolean; failed: string[] }> {
  const config = await loadConfig();
  const globalHooks = config.hooks[event as keyof typeof config.hooks] || [];
  const localHooks = projectHooks?.[event] || [];

  const allHooks = [...globalHooks, ...localHooks];
  const failed: string[] = [];

  for (const hook of allHooks) {
    const resolved = resolveHook(hook, context);
    try {
      await execa(resolved, [], {
        cwd: context.projectPath,
        shell: true,
        timeout: 300000, // 5 minute timeout
      });
    } catch (error) {
      failed.push(hook);
    }
  }

  return { success: failed.length === 0, failed };
}

export async function runHooksParallel(
  event: HookEvent,
  contexts: HookContext[]
): Promise<{ success: boolean; results: Map<string, string[]> }> {
  const results = new Map<string, string[]>();

  const config = await loadConfig();
  const hooks = config.hooks[event as keyof typeof config.hooks] || [];

  for (const context of contexts) {
    const failed: string[] = [];

    for (const hook of hooks) {
      const resolved = resolveHook(hook, context);
      try {
        await execa(resolved, [], {
          cwd: context.projectPath,
          shell: true,
          timeout: 300000,
        });
      } catch {
        failed.push(hook);
      }
    }

    results.set(context.projectPath, failed);
  }

  const allSuccess = Array.from(results.values()).every((f) => f.length === 0);
  return { success: allSuccess, results };
}

function resolveHook(hook: string, context: HookContext): string {
  return hook
    .replace(/{packageManager}/g, context.packageManager)
    .replace(/{projectDir}/g, context.projectPath)
    .replace(/{branch}/g, context.branch || '')
    .replace(/{projectName}/g, context.projectName || '');
}

export async function runPreCleanHook(
  projectPath: string,
  dirs: string[]
): Promise<boolean> {
  // Default: allow clean without prompt
  // Can be customized to ask for confirmation
  return true;
}
