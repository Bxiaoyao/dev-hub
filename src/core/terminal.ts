import { execa } from 'execa';
import type { Config } from '../types/index';

const TERMINAL_COMMANDS: Record<string, { app: string; args: string[] }> = {
  terminal: { app: 'Terminal', args: [] },
  iterm2: { app: 'iTerm', args: [] },
  warp: { app: 'Warp', args: [] },
  alacritty: { app: 'Alacritty', args: [] },
  'kitty': { app: 'kitty', args: [] },
};

export async function openTerminal(
  projectPath: string,
  terminal: string
): Promise<{ success: boolean; error?: string }> {
  const config = TERMINAL_COMMANDS[terminal];

  try {
    if (process.platform === 'darwin') {
      // macOS
      await execa('open', ['-a', config?.app || terminal, projectPath]);
    } else if (process.platform === 'linux') {
      // Linux
      await execa(terminal, ['--working-directory', projectPath]);
    } else {
      return { success: false, error: 'Unsupported platform' };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to launch terminal: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function detectAvailableTerminals(): Promise<string[]> {
  if (process.platform !== 'darwin') {
    return [];
  }

  const available: string[] = [];

  for (const [name, config] of Object.entries(TERMINAL_COMMANDS)) {
    try {
      await execa('osascript', [
        '-e',
        `tell application "System Events" to get name of every application process`,
      ]);
      // Assume all are potentially available on macOS
      available.push(name);
    } catch {
      // Not available
    }
  }

  return available;
}