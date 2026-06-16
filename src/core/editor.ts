import { execa } from 'execa';
import type { Config } from '../types/index';

const EDITOR_COMMANDS: Record<string, string> = {
  cursor: 'cursor',
  code: 'code',
  'code-insiders': 'code-insiders',
  webstorm: 'webstorm',
  idea: 'idea',
  atom: 'atom',
  subl: 'subl',
  vim: 'vim',
  nvim: 'nvim',
};

export async function openInEditor(
  projectPath: string,
  editor: string
): Promise<{ success: boolean; error?: string }> {
  const command = EDITOR_COMMANDS[editor] || editor;

  try {
    await execa(command, [projectPath], { detached: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to launch ${editor}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function detectAvailableEditors(): Promise<string[]> {
  const available: string[] = [];

  for (const [name, command] of Object.entries(EDITOR_COMMANDS)) {
    try {
      await execa('which', [command]);
      available.push(name);
    } catch {
      // Editor not available
    }
  }

  return available;
}

export async function getEditor(config: Config): Promise<string> {
  // Check if default is available
  const available = await detectAvailableEditors();

  if (config.editor.default && available.includes(config.editor.default)) {
    return config.editor.default;
  }

  // Try fallbacks
  for (const fallback of config.editor.fallback) {
    if (available.includes(fallback)) {
      return fallback;
    }
  }

  // Return first available
  if (available.length > 0) {
    return available[0];
  }

  return 'code'; // Default fallback
}