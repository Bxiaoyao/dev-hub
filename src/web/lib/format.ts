import { formatDistanceToNow } from 'date-fns';

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/** 卡片等紧凑场景用的短时间文案 */
export function formatShortRelativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}时`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天`;
  return formatRelativeTime(date);
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