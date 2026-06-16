import chalk from 'chalk';
import { initConfig } from '../utils/config';
import { scanProjects } from '../core/scanner';
import { exportProjectsToFile } from '../core/export';

export async function exportProjects(options: {
  output: string;
  hooks: boolean;
}): Promise<void> {
  const config = await initConfig();
  const projects = await scanProjects(config);

  console.log(chalk.dim(`Found ${projects.length} projects...`));

  const result = await exportProjectsToFile(projects, options.output);

  if (result.success) {
    console.log(chalk.green(`✓ Exported ${projects.length} projects to ${options.output}`));
  } else {
    console.log(chalk.red(`✗ Export failed: ${result.error}`));
  }
}