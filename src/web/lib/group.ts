import type { Project } from './types';

export function getParentDir(projectPath: string): string {
  const sep = projectPath.includes('\\') ? '\\' : '/';
  const parts = projectPath.split(/[/\\]/);
  parts.pop();
  return parts.join(sep) || projectPath;
}

export interface ProjectGroup {
  parentDir: string;
  projects: Project[];
}

/** 按项目所在父目录分组，组内保持原顺序 */
export function groupProjectsByParent(projects: Project[]): ProjectGroup[] {
  if (!Array.isArray(projects)) return [];

  const map = new Map<string, Project[]>();

  for (const project of projects) {
    const parent = getParentDir(project.path);
    const list = map.get(parent) ?? [];
    list.push(project);
    map.set(parent, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([parentDir, groupProjects]) => ({ parentDir, projects: groupProjects }));
}
