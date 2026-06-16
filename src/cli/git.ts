import chalk from 'chalk';
import { initConfig } from '../utils/config';
import { scanProjects } from '../core/scanner';
import { pull, fetchAll } from '../core/git';

export async function gitAction(
  projectName: string,
  action?: string
): Promise<void> {
  const config = await initConfig();
  const projects = await scanProjects(config);

  const project = projects.find(
    (p) => p.name === projectName || p.path.endsWith(projectName)
  );

  if (!project) {
    console.log(chalk.red(`Project "${projectName}" not found`));
    return;
  }

  if (!project.isGit) {
    console.log(chalk.red(`${project.name} is not a Git repository`));
    return;
  }

  switch (action) {
    case 'pull': {
      console.log(chalk.dim(`Pulling ${project.name}...`));
      const result = await pull(project.path);
      if (result.success) {
        console.log(chalk.green(`✓ Pulled successfully`));
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
      }
      break;
    }
    case 'fetch': {
      console.log(chalk.dim(`Fetching ${project.name}...`));
      const result = await fetchAll(project.path);
      if (result.success) {
        console.log(chalk.green(`✓ Fetched successfully`));
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
      }
      break;
    }
    case 'status': {
      console.log(chalk.bold(`${project.name}`));
      console.log(`  Branch: ${project.branch || '-'}`);
      console.log(`  Status: ${project.status}`);
      if (project.uncommittedChanges) {
        console.log(`  Uncommitted: ${project.uncommittedChanges}`);
      }
      if (project.ahead) {
        console.log(`  Ahead: ${project.ahead}`);
      }
      if (project.behind) {
        console.log(`  Behind: ${project.behind}`);
      }
      break;
    }
    default:
      console.log(chalk.yellow(`Unknown action: ${action}`));
      console.log('Available actions: pull, fetch, status');
  }
}