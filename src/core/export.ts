import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import type { Project, ExportData, ExportedProject, Config } from '../types/index.js';

export async function exportProjectsToFile(
  projects: Project[],
  outputPath: string
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    const exportedProjects: ExportedProject[] = projects.map((p) => ({
      name: p.name,
      git: p.remote,
      branch: p.branch,
      packageManager: p.packageManager,
      nodeVersion: undefined,
    }));

    const exportData: ExportData = {
      version: 1,
      generated: new Date().toISOString(),
      projects: exportedProjects,
    };

    const content = YAML.stringify(exportData);
    await fs.writeFile(outputPath, content, 'utf-8');

    return { success: true, path: outputPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function loadExportFile(
  filePath: string
): Promise<{ success: boolean; data?: ExportData; error?: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = YAML.parse(content);

    if (!data.version || !data.projects) {
      return { success: false, error: 'Invalid export file format' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}