import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/** 将绝对路径缩短为 ~ 开头，便于区分同名项目 */
export function formatProjectPath(projectPath: string): string {
  const normalized = projectPath.replace(/\\/g, '/');

  const unixHome = normalized.match(/^\/(?:Users|home)\/[^/]+/);
  if (unixHome) {
    return `~${normalized.slice(unixHome[0].length)}`;
  }

  const winHome = normalized.match(/^[A-Za-z]:\/Users\/[^/]+/i);
  if (winHome) {
    return `~${normalized.slice(winHome[0].length).replace(/\//g, '\\')}`;
  }

  return projectPath;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}