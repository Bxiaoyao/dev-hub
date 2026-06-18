import { execa } from 'execa';
import os from 'os';
import path from 'path';

export async function revealInFileManager(
  targetPath: string
): Promise<{ success: boolean; error?: string }> {
  const platform = os.platform();

  try {
    if (platform === 'darwin') {
      await execa('open', ['-R', targetPath]);
    } else if (platform === 'win32') {
      await execa('explorer', [`/select,${path.normalize(targetPath)}`], { shell: true });
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
