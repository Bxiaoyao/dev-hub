import Table from 'cli-table3';
import chalk from 'chalk';
import { initConfig } from '../utils/config.js';
import { scanProjects } from '../core/scanner.js';

export async function listProjects(options: {
  json?: boolean;
  filter?: string;
}): Promise<void> {
  const config = await initConfig();
  const projects = await scanProjects(config);

  let filtered = projects;
  if (options.filter) {
    filtered = projects.filter((p) =>
      p.name.toLowerCase().includes(options.filter!.toLowerCase())
    );
  }

  if (options.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  // Table output
  const table = new Table({
    head: ['Name', 'Branch', 'Status', 'Package Mgr', 'Last Modified'],
    colWidths: [25, 15, 20, 15, 20],
  });

  for (const project of filtered) {
    table.push([
      project.name,
      project.branch || '-',
      project.status === 'clean'
        ? chalk.green('✓ clean')
        : project.status === 'dirty'
          ? chalk.yellow(`⚠ dirty (${project.uncommittedChanges})`)
          : '?',
      project.packageManager || '-',
      project.lastModified.toLocaleDateString(),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\n${filtered.length} projects found`));
}