import fs from 'fs/promises';
import path from 'path';
import type { SizeInfo } from '../types/index.js';
import { runHook } from './hooks.js';

const CLEANABLE_DIRS = ['node_modules', 'dist', '.next', 'build', '.turbo', '.cache', 'out'];

export async function getProjectSize(projectPath: string): Promise<SizeInfo> {
  const breakdown: { name: string; size: number; cleanable: boolean }[] = [];
  let total = 0;

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) {
        // Check .git and other hidden dirs
      }

      const dirPath = path.join(projectPath, entry.name);
      const size = await getDirectorySize(dirPath);
      const cleanable = CLEANABLE_DIRS.includes(entry.name);

      if (size > 0) {
        breakdown.push({ name: entry.name, size, cleanable });
        total += size;
      }
    }
  } catch {
    // Permission denied or other error
  }

  // Sort by size descending
  breakdown.sort((a, b) => b.size - a.size);

  return { total, breakdown };
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          size += await getDirectorySize(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          size += stat.size;
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch {
    // Directory not accessible
  }

  return size;
}

export async function cleanDirectory(
  projectPath: string,
  dirName: string,
  options?: { skipHooks?: boolean }
): Promise<{ success: boolean; error?: string; freedBytes?: number }> {
  const dirPath = path.join(projectPath, dirName);

  try {
    // Run beforeClean hook
    if (!options?.skipHooks) {
      await runHook('beforeClean', {
        projectPath,
        packageManager: 'npm', // Will be overridden by caller
        projectName: path.basename(projectPath),
      });
    }

    // Get size before cleaning
    const size = await getDirectorySize(dirPath);

    // Remove directory
    await fs.rm(dirPath, { recursive: true, force: true });

    return { success: true, freedBytes: size };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function cleanMultiple(
  projectPath: string,
  dirNames: string[],
  options?: { skipHooks?: boolean }
): Promise<{ cleaned: string[]; failed: string[]; totalFreed: number }> {
  const cleaned: string[] = [];
  const failed: string[] = [];
  let totalFreed = 0;

  for (const dirName of dirNames) {
    const result = await cleanDirectory(projectPath, dirName, options);
    if (result.success) {
      cleaned.push(dirName);
      totalFreed += result.freedBytes || 0;
    } else {
      failed.push(dirName);
    }
  }

  return { cleaned, failed, totalFreed };
}