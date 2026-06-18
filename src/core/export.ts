import fs from 'fs/promises';
import YAML from 'yaml';
import type { Project, ExportData, ExportedProject } from '../types/index.js';

export function buildExportData(projects: Project[]): ExportData {
  const exportedProjects: ExportedProject[] = projects
    .filter((p) => p.remote)
    .map((p) => ({
      name: p.name,
      git: p.remote!,
      branch: p.branch,
      packageManager: p.packageManager,
      path: p.path,
      tags: p.tags?.length ? p.tags : undefined,
    }));

  return {
    version: 1,
    generated: new Date().toISOString(),
    projects: exportedProjects,
  };
}

export function serializeExportData(data: ExportData): string {
  return YAML.stringify(data);
}

export function parseExportContent(content: string): {
  success: boolean;
  data?: ExportData;
  error?: string;
} {
  try {
    const data = YAML.parse(content) as ExportData;
    if (!data?.version || !Array.isArray(data.projects)) {
      return { success: false, error: '无效的导出文件格式' };
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportProjectsToFile(
  projects: Project[],
  outputPath: string
): Promise<{ success: boolean; error?: string; path?: string; count?: number }> {
  try {
    const exportData = buildExportData(projects);
    const content = serializeExportData(exportData);
    await fs.writeFile(outputPath, content, 'utf-8');

    return { success: true, path: outputPath, count: exportData.projects.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function exportProjectsToContent(
  projects: Project[]
): { success: boolean; content?: string; filename?: string; count?: number; skipped?: number; error?: string } {
  try {
    const withRemote = projects.filter((p) => p.remote);
    const skipped = projects.length - withRemote.length;
    const exportData = buildExportData(withRemote);
    const content = serializeExportData(exportData);
    const date = new Date().toISOString().slice(0, 10);

    return {
      success: true,
      content,
      filename: `devhub-workspace-${date}.yaml`,
      count: exportData.projects.length,
      skipped,
    };
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
    return parseExportContent(content);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}