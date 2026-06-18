import chalk from 'chalk';
import { initConfig } from '../utils/config.js';
import { scanProjects } from '../core/scanner.js';
import { getBranches, getRecentCommits } from '../core/git.js';

export async function showProjectInfo(projectName: string): Promise<void> {
  const config = await initConfig();
  const projects = await scanProjects(config);

  const project = projects.find(
    (p) => p.name === projectName || p.path.endsWith(projectName)
  );

  if (!project) {
    console.log(chalk.red(`Project "${projectName}" not found`));
    return;
  }

  console.log(chalk.bold.cyan(`\n${project.name}\n`));
  console.log(`  Path:       ${project.path}`);
  console.log(`  Branch:     ${project.branch || '-'}`);
  console.log(`  Remote:     ${project.remote || '-'}`);
  console.log(`  Status:     ${project.status}`);
  console.log(`  Package:    ${project.packageManager || 'None'}`);

  if (project.isGit) {
    console.log(chalk.dim('\n  Recent commits:'));
    const commits = await getRecentCommits(project.path, 5);
    commits.forEach((commit) => {
      console.log(chalk.dim(`    ${commit}`));
    });

    const branches = await getBranches(project.path);
    console.log(chalk.dim(`\n  Branches (${branches.length}):`));
    branches.slice(0, 10).forEach((b) => {
      const marker = b.isCurrent ? '*' : ' ';
      console.log(chalk.dim(`    ${marker} ${b.name}${b.isRemote ? ' (remote)' : ''}`));
    });
    if (branches.length > 10) {
      console.log(chalk.dim(`    ... and ${branches.length - 10} more`));
    }
  }

  console.log();
}