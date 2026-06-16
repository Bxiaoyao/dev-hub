import { simpleGit } from 'simple-git';
import type { BranchInfo } from '../types/index';

export async function getGitInfo(dir: string): Promise<{
  branch: string;
  remote: string | undefined;
}> {
  const git = simpleGit(dir);

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
  const git = simpleGit(dir);

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
  const git = simpleGit(dir);
  const branches: BranchInfo[] = [];

  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;

    for (const [name, info] of Object.entries(branchSummary.branches)) {
      const isRemote = name.startsWith('remotes/');
      const cleanName = isRemote ? name.replace('remotes/origin/', '') : name;

      branches.push({
        name: cleanName,
        isCurrent: cleanName === currentBranch,
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
  const git = simpleGit(dir);

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
  const git = simpleGit(dir);

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
  const git = simpleGit(dir);

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
  const git = simpleGit(dir);

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

export async function pull(dir: string): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit(dir);

  try {
    await git.pull();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchAll(dir: string): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit(dir);

  try {
    await git.fetch(['--all', '--prune']);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getRecentCommits(dir: string, count = 10): Promise<string[]> {
  const git = simpleGit(dir);

  try {
    const log = await git.log(['--oneline', `-n${count}`]);
    return log.all.map((commit: { hash: string; message: string }) => `${commit.hash.substring(0, 7)} ${commit.message}`);
  } catch {
    return [];
  }
}

export async function cloneRepo(
  url: string,
  targetDir: string
): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit();

  try {
    await git.clone(url, targetDir);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 新增：批量提交
export async function commitChanges(
  dir: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit(dir);

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
  branch?: string
): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit(dir);

  try {
    if (branch) {
      await git.push('origin', branch);
    } else {
      await git.push();
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 新增：创建分支并切换（用于批量创建升级分支）
export async function createAndCheckoutBranch(
  dir: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  const git = simpleGit(dir);

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