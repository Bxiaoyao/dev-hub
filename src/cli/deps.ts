import chalk from 'chalk';
import { execa } from 'execa';
import { initConfig } from '../utils/config.js';
import { scanProjects } from '../core/scanner.js';

export async function depsAction(
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

  if (!project.packageManager) {
    console.log(chalk.red(`${project.name} has no package manager detected`));
    return;
  }

  const pm = project.packageManager;

  switch (action) {
    case 'install':
    case 'i': {
      console.log(chalk.dim(`Installing dependencies in ${project.name}...`));
      try {
        await execa(pm, ['install'], { cwd: project.path });
        console.log(chalk.green(`✓ Dependencies installed`));
      } catch (error) {
        console.log(chalk.red(`✗ Install failed`));
      }
      break;
    }
    case 'update':
    case 'u': {
      console.log(chalk.dim(`Updating dependencies in ${project.name}...`));
      try {
        const args = pm === 'npm' ? ['update'] : ['update'];
        await execa(pm, args, { cwd: project.path });
        console.log(chalk.green(`✓ Dependencies updated`));
      } catch (error) {
        console.log(chalk.red(`✗ Update failed`));
      }
      break;
    }
    case 'audit': {
      console.log(chalk.dim(`Running audit in ${project.name}...`));
      try {
        await execa(pm, ['audit'], { cwd: project.path, stdio: 'inherit' });
      } catch (error) {
        // Audit found vulnerabilities, exit code will be non-zero
      }
      break;
    }
    default:
      console.log(chalk.yellow(`Unknown action: ${action}`));
      console.log('Available actions: install, update, audit');
  }
}