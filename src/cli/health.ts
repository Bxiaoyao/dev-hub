import chalk from 'chalk';
import { initConfig } from '../utils/config';
import { scanProjects } from '../core/scanner';
import { getGitStatus } from '../core/git';
import fs from 'fs/promises';
import path from 'path';

export async function healthCheck(fix: boolean): Promise<void> {
  const config = await initConfig();
  const projects = await scanProjects(config);

  console.log(chalk.bold('\nProject Health Report:\n'));

  const issues: { project: string; issues: string[] }[] = [];

  for (const project of projects) {
    const projectIssues: string[] = [];

    // Check git status
    if (project.isGit) {
      if (project.status === 'dirty') {
        projectIssues.push(`Uncommitted changes (${project.uncommittedChanges})`);
      }

      if (project.behind && project.behind > 5) {
        projectIssues.push(`${project.behind} commits behind origin`);
      }
    }

    // Check for missing node_modules
    if (project.hasPackageJson) {
      try {
        await fs.access(path.join(project.path, 'node_modules'));
      } catch {
        projectIssues.push('node_modules missing (run: install)');
      }
    }

    // Check for .env.example without .env
    try {
      await fs.access(path.join(project.path, '.env.example'));
      try {
        await fs.access(path.join(project.path, '.env'));
      } catch {
        projectIssues.push('.env missing (have .env.example)');
      }
    } catch {
      // No .env.example, that's fine
    }

    if (projectIssues.length === 0) {
      console.log(chalk.green(`  ✓ ${project.name} — healthy`));
    } else {
      console.log(chalk.yellow(`  ⚠ ${project.name} — ${projectIssues.length} issues`));
      projectIssues.forEach((issue) => {
        console.log(chalk.dim(`      - ${issue}`));
      });
      issues.push({ project: project.name, issues: projectIssues });
    }
  }

  console.log();
  console.log(chalk.bold('Summary:'));
  console.log(chalk.green(`  ${projects.length - issues.length} healthy`));
  console.log(chalk.yellow(`  ${issues.length} with issues`));

  if (fix) {
    console.log(chalk.dim('\nAuto-fix is not yet implemented'));
  }
}