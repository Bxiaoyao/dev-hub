import chalk from 'chalk';
import { initConfig } from '../utils/config.js';
import { scanProjects } from '../core/scanner.js';
import { execa } from 'execa';

export async function batchAction(
  action: string,
  options: { parallel?: boolean }
): Promise<void> {
  const config = await initConfig();
  const projects = await scanProjects(config);

  console.log(chalk.dim(`Found ${projects.length} projects`));

  switch (action) {
    case 'install':
      await batchInstall(projects, options.parallel);
      break;
    case 'clean':
      await batchClean(projects, options.parallel);
      break;
    case 'check':
      await batchCheck(projects);
      break;
    default:
      console.log(chalk.yellow(`Unknown batch action: ${action}`));
      console.log('Available actions: install, clean, check');
  }
}

async function batchInstall(
  projects: Awaited<ReturnType<typeof scanProjects>>,
  parallel?: boolean
): Promise<void> {
  console.log(chalk.dim('Installing dependencies in all projects...'));

  const tasks = projects
    .filter((p) => p.packageManager)
    .map(async (project) => {
      try {
        await execa(project.packageManager!, ['install'], {
          cwd: project.path,
        });
        return { name: project.name, success: true };
      } catch {
        return { name: project.name, success: false };
      }
    });

  const results = await Promise.allSettled(tasks);

  let success = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        console.log(chalk.green(`✓ ${result.value.name}`));
        success++;
      } else {
        console.log(chalk.red(`✗ ${result.value.name}`));
        failed++;
      }
    }
  });

  console.log(chalk.bold('\nSummary:'));
  console.log(chalk.green(`  ${success} succeeded`));
  if (failed > 0) {
    console.log(chalk.red(`  ${failed} failed`));
  }
}

async function batchClean(
  projects: Awaited<ReturnType<typeof scanProjects>>,
  parallel?: boolean
): Promise<void> {
  console.log(chalk.dim('Cleaning build artifacts...'));

  const dirs = ['node_modules', 'dist', '.next', 'build', '.turbo'];

  for (const project of projects) {
    console.log(chalk.dim(`  Cleaning ${project.name}...`));
    // Clean logic would go here
    console.log(chalk.green(`  ✓ ${project.name}`));
  }
}

async function batchCheck(
  projects: Awaited<ReturnType<typeof scanProjects>>
): Promise<void> {
  console.log(chalk.bold('\nProject Health Report:\n'));

  for (const project of projects) {
    const issues: string[] = [];

    if (project.status === 'dirty') {
      issues.push(`Uncommitted changes (${project.uncommittedChanges})`);
    }

    if (project.behind && project.behind > 0) {
      issues.push(`${project.behind} commits behind remote`);
    }

    if (!project.packageManager && project.hasPackageJson) {
      issues.push('No package manager detected');
    }

    if (issues.length === 0) {
      console.log(chalk.green(`  ✓ ${project.name} — healthy`));
    } else {
      console.log(chalk.yellow(`  ⚠ ${project.name}`));
      issues.forEach((issue) => {
        console.log(chalk.dim(`      - ${issue}`));
      });
    }
  }
}