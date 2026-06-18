import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import type { DependencyInfo, OutdatedPackage } from '../types/index.js';

export async function getDependencyInfo(projectPath: string): Promise<DependencyInfo | null> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);

    return {
      name: packageJson.name || path.basename(projectPath),
      version: packageJson.version || '0.0.0',
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
    };
  } catch {
    return null;
  }
}

export async function getOutdatedPackages(
  projectPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
): Promise<OutdatedPackage[]> {
  const outdated: OutdatedPackage[] = [];

  try {
    let result;
    switch (packageManager) {
      case 'pnpm':
        result = await execa('pnpm', ['outdated', '--json'], {
          cwd: projectPath,
          reject: false,
        });
        break;
      case 'yarn':
        result = await execa('yarn', ['outdated', '--json'], {
          cwd: projectPath,
          reject: false,
        });
        break;
      case 'bun':
        result = await execa('bun', ['outdated', '--json'], {
          cwd: projectPath,
          reject: false,
        });
        break;
      default:
        result = await execa('npm', ['outdated', '--json'], {
          cwd: projectPath,
          reject: false,
        });
    }

    if (result.stdout) {
      const data = JSON.parse(result.stdout);
      for (const [name, info] of Object.entries(data)) {
        const pkgInfo = info as { current: string; latest: string; type?: string };
        outdated.push({
          name,
          current: pkgInfo.current || 'N/A',
          latest: pkgInfo.latest || 'N/A',
          type: (pkgInfo.type as 'dependencies' | 'devDependencies') || 'dependencies',
        });
      }
    }
  } catch {
    // No outdated packages or command failed
  }

  return outdated;
}

export async function installDependencies(
  projectPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
): Promise<{ success: boolean; error?: string }> {
  try {
    const args = packageManager === 'npm' ? ['install'] : ['install'];
    await execa(packageManager, args, { cwd: projectPath });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function upgradePackage(
  projectPath: string,
  packageName: string,
  version: string | undefined,
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
): Promise<{ success: boolean; error?: string }> {
  try {
    const versionSpec = version ? `@${version}` : '@latest';
    let args: string[];

    switch (packageManager) {
      case 'pnpm':
        args = ['update', `${packageName}${versionSpec}`];
        break;
      case 'yarn':
        args = ['upgrade', `${packageName}${versionSpec}`];
        break;
      case 'bun':
        args = ['update', packageName];
        break;
      default:
        args = ['install', `${packageName}${versionSpec}`];
    }

    await execa(packageManager, args, { cwd: projectPath });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function runAudit(
  projectPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
): Promise<{ success: boolean; vulnerabilities?: number; error?: string }> {
  try {
    const args = ['audit'];
    if (packageManager === 'pnpm') {
      args.push('--json');
    }

    const result = await execa(packageManager, args, {
      cwd: projectPath,
      reject: false,
    });

    // Parse audit output for vulnerability count
    let vulnerabilities = 0;
    if (result.stdout) {
      try {
        const data = JSON.parse(result.stdout);
        vulnerabilities = data.metadata?.vulnerabilities?.total || 0;
      } catch {
        // Non-JSON output, check for patterns
        vulnerabilities = (result.stdout.match(/vulnerabilities?/gi) || []).length;
      }
    }

    return { success: true, vulnerabilities };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getDependencyTree(
  projectPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
): Promise<string[]> {
  try {
    let result;
    switch (packageManager) {
      case 'pnpm':
        result = await execa('pnpm', ['list', '--depth=0'], { cwd: projectPath });
        break;
      case 'yarn':
        result = await execa('yarn', ['list', '--depth=0'], { cwd: projectPath });
        break;
      case 'bun':
        result = await execa('bun', ['pm', 'ls'], { cwd: projectPath });
        break;
      default:
        result = await execa('npm', ['list', '--depth=0'], { cwd: projectPath });
    }

    return result.stdout.split('\n').filter((line) => line.trim());
  } catch {
    return [];
  }
}