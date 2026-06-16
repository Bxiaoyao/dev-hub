import chalk from 'chalk';
import { initConfig } from '../utils/config';
import { scanProjects } from '../core/scanner';
import { openInEditor, getEditor } from '../core/editor';

export async function openProject(
  projectName?: string,
  editor?: string
): Promise<void> {
  const config = await initConfig();

  if (!projectName) {
    // If no project name, open current directory
    const resolvedEditor = editor || (await getEditor(config));
    const result = await openInEditor(process.cwd(), resolvedEditor);
    if (result.success) {
      console.log(chalk.green(`✓ Opened in ${resolvedEditor}`));
    } else {
      console.log(chalk.red(`✗ ${result.error}`));
    }
    return;
  }

  const projects = await scanProjects(config);
  const project = projects.find(
    (p) => p.name === projectName || p.path.endsWith(projectName)
  );

  if (!project) {
    console.log(chalk.red(`Project "${projectName}" not found`));
    return;
  }

  const resolvedEditor = editor || (await getEditor(config));
  const result = await openInEditor(project.path, resolvedEditor);

  if (result.success) {
    console.log(chalk.green(`✓ Opened ${project.name} in ${resolvedEditor}`));
  } else {
    console.log(chalk.red(`✗ ${result.error}`));
  }
}