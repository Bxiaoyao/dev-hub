import chalk from 'chalk';
import ora from 'ora';
import { initConfig } from '../utils/config';
import { scanProjects } from '../core/scanner';
import { saveSnapshot, loadSnapshot, listSnapshots, deleteSnapshot } from '../core/snapshot';

export async function snapshotAction(
  subcommand: string,
  options: { name?: string; file?: string }
): Promise<void> {
  switch (subcommand) {
    case 'save':
      await saveSnapshotAction(options.name || 'default');
      break;
    case 'restore':
      await restoreSnapshotAction(options.name || 'default');
      break;
    case 'list':
      await listSnapshotsAction();
      break;
    case 'delete':
      await deleteSnapshotAction(options.name || 'default');
      break;
    default:
      console.log(chalk.yellow(`Unknown subcommand: ${subcommand}`));
      console.log('Available: save, restore, list, delete');
  }
}

async function saveSnapshotAction(name: string): Promise<void> {
  const spinner = ora('Creating snapshot...').start();

  const config = await initConfig();
  const projects = await scanProjects(config);

  const result = await saveSnapshot(name, projects);

  if (result.success) {
    spinner.succeed(`Snapshot "${name}" created with ${projects.length} projects`);
    console.log(chalk.dim(`  Path: ${result.path}`));
  } else {
    spinner.fail(`Failed to create snapshot: ${result.error}`);
  }
}

async function restoreSnapshotAction(name: string): Promise<void> {
  const spinner = ora(`Loading snapshot "${name}"...`).start();

  const result = await loadSnapshot(name);

  if (result.success && result.snapshot) {
    spinner.succeed(`Snapshot "${name}" loaded`);
    console.log();
    console.log(chalk.bold('Projects:'));
    result.snapshot.projects.forEach((p) => {
      console.log(`  - ${p.name} (${p.git || 'no remote'})`);
    });

    if (result.snapshot.globalPackages?.npm?.length) {
      console.log();
      console.log(chalk.bold('Global npm packages:'));
      console.log(chalk.dim(`  ${result.snapshot.globalPackages.npm.join(', ')}`));
    }

    if (result.snapshot.nodeVersion) {
      console.log();
      console.log(chalk.bold('Node version:'));
      console.log(chalk.dim(`  ${result.snapshot.nodeVersion}`));
    }
  } else {
    spinner.fail(`Failed to load snapshot: ${result.error}`);
  }
}

async function listSnapshotsAction(): Promise<void> {
  const snapshots = await listSnapshots();

  if (snapshots.length === 0) {
    console.log(chalk.dim('No snapshots found'));
    return;
  }

  console.log(chalk.bold('\nSnapshots:\n'));
  snapshots.forEach((s) => {
    console.log(`  ${s.name}`);
    console.log(chalk.dim(`    Created: ${new Date(s.created).toLocaleString()}`));
    console.log(chalk.dim(`    Projects: ${s.projectCount}`));
  });
}

async function deleteSnapshotAction(name: string): Promise<void> {
  const result = await deleteSnapshot(name);

  if (result.success) {
    console.log(chalk.green(`✓ Snapshot "${name}" deleted`));
  } else {
    console.log(chalk.red(`✗ Failed to delete snapshot: ${result.error}`));
  }
}