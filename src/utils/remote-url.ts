export type RepoPlatform = 'github' | 'gitlab' | 'other';

export interface RepoWebInfo {
  platform: RepoPlatform;
  platformLabel: string;
  repoUrl: string;
  mergeRequestUrl: string | null;
}

/** 将 git remote 转为可浏览器访问的仓库地址 */
export function gitRemoteToWebUrl(remote: string): string | null {
  let url = remote.trim();
  if (!url) return null;

  if (url.startsWith('git@')) {
    const match = url.match(/^git@([^:]+):(.+)$/);
    if (!match) return null;
    url = `https://${match[1]}/${match[2]}`;
  } else {
    try {
      const parsed = new URL(url);
      parsed.username = '';
      parsed.password = '';
      url = `${parsed.origin}${parsed.pathname}`;
    } catch {
      return null;
    }
  }

  return url.replace(/\.git\/?$/, '').replace(/\/$/, '');
}

export function detectRepoPlatform(repoUrl: string): RepoPlatform {
  const lower = repoUrl.toLowerCase();
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('gitlab')) return 'gitlab';
  return 'other';
}

/** 发起 MR/PR 的页面地址 */
export function buildMergeRequestUrl(
  repoUrl: string,
  branch: string,
  platform: RepoPlatform
): string {
  const encoded = encodeURIComponent(branch);
  if (platform === 'github') {
    return `${repoUrl}/pull/new/${encoded}`;
  }
  // GitLab 及多数自建 Git 平台
  return `${repoUrl}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encoded}`;
}

export function getRepoWebInfo(
  remote: string | undefined,
  branch?: string
): RepoWebInfo | null {
  if (!remote) return null;

  const repoUrl = gitRemoteToWebUrl(remote);
  if (!repoUrl) return null;

  const platform = detectRepoPlatform(repoUrl);
  const platformLabel =
    platform === 'github' ? 'GitHub' : platform === 'gitlab' ? 'GitLab' : '仓库';

  return {
    platform,
    platformLabel,
    repoUrl,
    mergeRequestUrl: branch ? buildMergeRequestUrl(repoUrl, branch, platform) : null,
  };
}
