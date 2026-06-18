import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadExportFile } from '../core/export.js';
import { importFromExport } from '../core/import.js';

export async function importProjects(options: {
  file: string;
  directory: string;
  parallel: string;
  skipHooks: boolean;
  dryRun: boolean;
}): Promise<void> {
  // Load export file
  const loadResult = await loadExportFile(options.file);
  if (!loadResult.success || !loadResult.data) {
    console.log(chalk.red(`✗ Failed to load file: ${loadResult.error}`));
    return;
  }

  const exportData = loadResult.data;
  console.log(chalk.dim(`Found ${exportData.projects.length} projects in export file`));

  if (options.dryRun) {
    console.log(chalk.yellow('Dry run mode - no changes will be made'));
    exportData.projects.forEach((p) => {
      console.log(`  - ${p.name} → ${path.join(options.directory, p.name)}`);
    });
    return;
  }

  // Import
  console.log(chalk.dim(`Importing to ${options.directory}...`));

  const results = await importFromExport(exportData, options.directory, {
    skipHooks: options.skipHooks,
    dryRun: options.dryRun,
  });

  // Report results
  let success = 0;
  let failed = 0;

  for (const result of results) {
    if (result.success) {
      console.log(chalk.green(`✓ ${result.project}`));
      success++;
    } else {
      console.log(chalk.red(`✗ ${result.project}: ${result.error}`));
      failed++;
    }
  }

  console.log();
  console.log(chalk.bold('Import complete:'));
  console.log(chalk.green(`  ${success} succeeded`));
  if (failed > 0) {
    console.log(chalk.red(`  ${failed} failed`));
  }
}