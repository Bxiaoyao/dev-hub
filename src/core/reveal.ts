import { execa } from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

function buildWindowsSelectArg(targetPath: string): string {
  const normalized = path.win32.normalize(targetPath);
  // explorer /select,<path> — 路径含空格时必须加引号
  if (/[\s"]/.test(normalized)) {
    return `/select,"${normalized.replace(/"/g, '')}"`;
  }
  return `/select,${normalized}`;
}

async function revealInWindowsExplorer(targetPath: string): Promise<void> {
  const normalized = path.win32.normalize(targetPath);

  let selectTarget = normalized;
  try {
    const stat = await fs.stat(normalized);
    if (!stat.isDirectory()) {
      selectTarget = path.win32.dirname(normalized);
    }
  } catch {
    selectTarget = path.win32.dirname(normalized);
  }

  const selectArg = buildWindowsSelectArg(selectTarget);

  // explorer.exe 成功打开后也常返回 exit code 1，不能用 reject 默认值
  const result = await execa('explorer.exe', [selectArg], {
    windowsHide: true,
    reject: false,
  });

  if (result.exitCode === 0 || result.exitCode === 1) {
    return;
  }

  // 降级：直接打开目录（不选中）
  const fallback = await execa('explorer.exe', [selectTarget], {
    windowsHide: true,
    reject: false,
  });

  if (fallback.exitCode !== 0 && fallback.exitCode !== 1) {
    throw new Error(
      `无法在资源管理器中打开: exit ${fallback.exitCode ?? 'unknown'}`
    );
  }
}

export async function revealInFileManager(
  targetPath: string
): Promise<{ success: boolean; error?: string }> {
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      await execa('open', ['-R', targetPath]);
    } else if (platform === 'win32') {
      await revealInWindowsExplorer(targetPath);
    } else {
      await execa('xdg-open', [path.dirname(targetPath)]);
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
