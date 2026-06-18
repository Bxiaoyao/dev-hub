import { simpleGit } from 'simple-git';
import type { BranchInfo, Config } from '../types/index.js';
import { execSync } from 'child_process';

// 配置 simple-git 选项
const gitOptions = {
  baseDir: process.cwd(),
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: true,
};

// 构建带有凭据的 Git 选项
export function buildGitOptions(config?: Config, forAuth: boolean = false) {
  const env: Record<string, string> = {
    ...process.env,
  };

  if (config?.git?.credentials && forAuth) {
    const { username, password, token, useSSH } = config.git.credentials;

    // 优先使用 SSH
    if (useSSH) {
      env.GIT_SSH_COMMAND = process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new';
      env.GIT_TERMINAL_PROMPT = '0';
    }
    // 如果提供了 token，使用 token 认证
    else if (token) {
      // 对于 Token 认证，我们使用 Git 的 credential helper 机制
      env.GIT_TERMINAL_PROMPT = '0';
      env.GIT_ASKPASS = 'echo';
      env.GIT_PASSWORD = token;
    }
    // 如果提供了用户名和密码
    else if (username && password) {
      env.GIT_TERMINAL_PROMPT = '0';
      env.GIT_ASKPASS = 'echo';
      env.GIT_USERNAME = username;
      env.GIT_PASSWORD = password;
    }
  } else {
    // 默认禁用交互式提示
    env.GIT_TERMINAL_PROMPT = '0';
    env.GIT_SSH_COMMAND = process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new';
  }

  return {
    ...gitOptions,
    env,
  };
}

// 为 HTTPS URL 添加认证信息
export function addAuthToUrl(url: string, config?: Config): string {
  if (!config?.git?.credentials || config.git.credentials.useSSH) {
    return url;
  }

  const { username, password, token } = config.git.credentials;

  // HTTPS URL
  if (url.startsWith('https://')) {
    // 使用 token
    if (token) {
      return url.replace('https://', `https://${token}@`);
    }
    // 使用用户名和密码
    else if (username && password) {
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      return url.replace('https://', `https://${encodedUsername}:${encodedPassword}@`);
    }
  }

  return url;
}

export async function getGitInfo(dir: string): Promise<{
  branch: string;
  remote: string | undefined;
}> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  const branchSummary = await git.branchLocal();
  const branch = branchSummary.current;

  let remote: string | undefined;
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r: { name: string }) => r.name === 'origin');
    remote = (origin as { refs?: { fetch?: string } })?.refs?.fetch;
  } catch {
    // No remote
  }

  return { branch, remote };
}

export async function getGitStatus(dir: string): Promise<{
  status: 'clean' | 'dirty' | 'unknown';
  uncommittedChanges: number;
  ahead: number;
  behind: number;
}> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    const status = await git.status();

    const uncommittedChanges =
      status.created.length +
      status.deleted.length +
      status.modified.length +
      status.renamed.length +
      status.staged.length;

    const ahead = status.ahead || 0;
    const behind = status.behind || 0;

    return {
      status: uncommittedChanges > 0 ? 'dirty' : 'clean',
      uncommittedChanges,
      ahead,
      behind,
    };
  } catch {
    return {
      status: 'unknown',
      uncommittedChanges: 0,
      ahead: 0,
      behind: 0,
    };
  }
}

export async function getBranches(dir: string): Promise<BranchInfo[]> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });
  const branches: BranchInfo[] = [];

  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;

    for (const [name, info] of Object.entries(branchSummary.branches)) {
      const isRemote = name.startsWith('remotes/');
      const cleanName = isRemote ? name.replace('remotes/origin/', '') : name;

      branches.push({
        name: cleanName,
        isCurrent: !isRemote && cleanName === currentBranch,
        isRemote,
        lastCommit: (info as { commit?: string }).commit,
      });
    }

    // Get ahead/behind for each branch
    for (const branch of branches) {
      if (!branch.isRemote) {
        try {
          const diff = await git.diffSummary([
            `${branch.name}...origin/${branch.name}`,
          ]);
          branch.ahead = diff.files.length;
        } catch {
          // Branch doesn't have remote
        }
      }
    }
  } catch {
    // Git operation failed
  }

  return branches;
}

export async function checkoutBranch(
  dir: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    // Check for uncommitted changes
    const status = await git.status();
    if (status.files.length > 0) {
      return {
        success: false,
        error: 'Working tree has uncommitted changes',
      };
    }

    await git.checkout(branch);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function stashAndCheckout(
  dir: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    await git.stash();
    await git.checkout(branch);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function createBranch(
  dir: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    await git.checkoutBranch(branch, 'HEAD');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteBranch(
  dir: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    await git.deleteLocalBranch(branch);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function pull(dir: string, config?: Config): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查是否配置了 HTTPS 凭据
    if (config?.git?.credentials && !config.git.credentials.useSSH) {
      const { token, username, password } = config.git.credentials;

      // 使用 git remote set-url 临时修改 URL 以包含认证信息
      if (token || (username && password)) {
        const git = simpleGit({ ...gitOptions, baseDir: dir });
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r: { name: string }) => r.name === 'origin');

        if (origin && (origin as { refs?: { fetch?: string } }).refs?.fetch?.startsWith('https://')) {
          const originalUrl = (origin as { refs?: { fetch?: string } }).refs.fetch!;
          const authUrl = addAuthToUrl(originalUrl, config);

          // 临时修改 remote URL
          await git.remote(['set-url', 'origin', authUrl]);

          try {
            // 执行 pull
            await git.pull();
          } finally {
            // 恢复原始 URL（移除认证信息）
            await git.remote(['set-url', 'origin', originalUrl]);
          }

          return { success: true };
        }
      }
    }

    // SSH 方式或未配置凭据时，使用默认方式
    const options = buildGitOptions(config, true);
    const git = simpleGit({ ...options, baseDir: dir });
    await git.pull();

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // 提供更友好的错误提示
    if (errorMsg.includes('could not read Username') ||
        errorMsg.includes('Authentication') ||
        errorMsg.includes('Permission denied') ||
        errorMsg.includes('fatal: could not read Password')) {
      return {
        success: false,
        error: '认证失败：请在设置页面配置 Git 凭据。推荐使用 SSH 密钥认证，或将 HTTPS 仓库改为 SSH 地址。',
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function fetchAll(dir: string, config?: Config): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查是否配置了 HTTPS 凭据
    if (config?.git?.credentials && !config.git.credentials.useSSH) {
      const { token, username, password } = config.git.credentials;

      // 使用 git remote set-url 临时修改 URL 以包含认证信息
      if (token || (username && password)) {
        const options = buildGitOptions(undefined, false);
        const git = simpleGit({ ...options, baseDir: dir });
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r: { name: string }) => r.name === 'origin');

        if (origin && (origin as { refs?: { fetch?: string } }).refs?.fetch?.startsWith('https://')) {
          const originalUrl = (origin as { refs?: { fetch?: string } }).refs.fetch!;
          const authUrl = addAuthToUrl(originalUrl, config);

          // 临时修改 remote URL
          await git.remote(['set-url', 'origin', authUrl]);

          try {
            // 执行 fetch
            await git.fetch(['--all', '--prune']);
          } finally {
            // 恢复原始 URL
            await git.remote(['set-url', 'origin', originalUrl]);
          }

          return { success: true };
        }
      }
    }

    // SSH 方式或未配置凭据时
    const options = buildGitOptions(config, true);
    const git = simpleGit({ ...options, baseDir: dir });
    await git.fetch(['--all', '--prune']);

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (errorMsg.includes('could not read Username') ||
        errorMsg.includes('Authentication') ||
        errorMsg.includes('Permission denied')) {
      return {
        success: false,
        error: '认证失败：请在设置页面配置 Git 凭据。推荐使用 SSH 密钥认证，或将 HTTPS 仓库改为 SSH 地址。',
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export async function getRecentCommits(dir: string, count = 10): Promise<CommitInfo[]> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    const log = await git.log({ maxCount: count });
    return log.all.map((commit) => ({
      hash: commit.hash.substring(0, 7),
      message: (commit.message || commit.body?.split('\n')[0] || '').trim(),
      author: commit.author_name || '',
      date: commit.date || '',
    }));
  } catch {
    return [];
  }
}

export async function cloneRepo(
  url: string,
  targetDir: string,
  config?: Config,
  branch?: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(config, true);
  const git = simpleGit(options);

  try {
    const authUrl = addAuthToUrl(url, config);

    if (branch) {
      try {
        await git.clone(authUrl, targetDir, [
          '--branch',
          branch,
          '--single-branch',
        ]);
        return { success: true };
      } catch {
        await git.clone(authUrl, targetDir);
        const checkout = simpleGit({ ...options, baseDir: targetDir });
        await checkout.checkout(branch);
        return { success: true };
      }
    }

    await git.clone(authUrl, targetDir);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errorMsg.includes('Authentication') || errorMsg.includes('Permission denied')) {
      return {
        success: false,
        error: '认证失败：请在设置页面配置 Git 凭据或使用 SSH URL。',
      };
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// 新增：批量提交
export async function commitChanges(
  dir: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    // 先添加所有更改
    await git.add('.');
    // 然后提交
    await git.commit(message);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 新增：推送
export async function push(
  dir: string,
  branch?: string,
  config?: Config
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查是否配置了 HTTPS 凭据
    if (config?.git?.credentials && !config.git.credentials.useSSH) {
      const { token, username, password } = config.git.credentials;

      if (token || (username && password)) {
        const options = buildGitOptions(undefined, false);
        const git = simpleGit({ ...options, baseDir: dir });
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r: { name: string }) => r.name === 'origin');

        if (origin && (origin as { refs?: { fetch?: string } }).refs?.fetch?.startsWith('https://')) {
          const originalUrl = (origin as { refs?: { fetch?: string } }).refs.fetch!;
          const authUrl = addAuthToUrl(originalUrl, config);

          // 临时修改 remote URL
          await git.remote(['set-url', 'origin', authUrl]);

          try {
            // 执行 push
            if (branch) {
              await git.push('origin', branch);
            } else {
              await git.push();
            }
          } finally {
            // 恢复原始 URL
            await git.remote(['set-url', 'origin', originalUrl]);
          }

          return { success: true };
        }
      }
    }

    // SSH 方式或未配置凭据时
    const options = buildGitOptions(config, true);
    const git = simpleGit({ ...options, baseDir: dir });

    if (branch) {
      await git.push('origin', branch);
    } else {
      await git.push();
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (errorMsg.includes('could not read Username') ||
        errorMsg.includes('Authentication') ||
        errorMsg.includes('Permission denied')) {
      return {
        success: false,
        error: '认证失败：请在设置页面配置 Git 凭据。推荐使用 SSH 密钥认证，或将 HTTPS 仓库改为 SSH 地址。',
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}

// 新增：创建分支并切换（用于批量创建升级分支）
export async function createAndCheckoutBranch(
  dir: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const options = buildGitOptions(undefined, false);
  const git = simpleGit({ ...options, baseDir: dir });

  try {
    // 检查是否有未提交的更改
    const status = await git.status();
    if (status.files.length > 0) {
      return {
        success: false,
        error: 'Working tree has uncommitted changes. Please commit or stash first.',
      };
    }

    // 创建并切换到新分支
    await git.checkoutBranch(branch, 'HEAD');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}