import path from 'path';

/** 统一项目路径为存储/比较用的 canonical 形式（Windows 下忽略大小写） */
export function normalizeProjectPath(projectPath: string): string {
  const resolved = path.resolve(projectPath.trim());
  if (process.platform === 'win32') {
    return resolved.toLowerCase();
  }
  return resolved;
}

export function pathsEqual(a: string, b: string): boolean {
  return normalizeProjectPath(a) === normalizeProjectPath(b);
}
