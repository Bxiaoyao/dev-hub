import chalk from 'chalk';
import ora from 'ora';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const TEMPLATES: Record<string, { repo: string; description: string }> = {
  'nextjs-app': {
    repo: 'https://github.com/vercel/next.js/tree/canary/examples',
    description: 'Next.js (App Router)',
  },
  'nextjs-pages': {
    repo: 'https://github.com/vercel/next.js/tree/canary/examples',
    description: 'Next.js (Pages Router)',
  },
  'vite-react': {
    repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite',
    description: 'Vite + React',
  },
  'vite-vue': {
    repo: 'https://github.com/vitejs/vite/tree/main/packages/create-vite',
    description: 'Vite + Vue',
  },
  'express-api': {
    repo: 'https://github.com/expressjs/express',
    description: 'Express API',
  },
};

export async function createProject(
  template?: string,
  name?: string
): Promise<void> {
  // Interactive mode if no args
  if (!template) {
    console.log(chalk.bold('\nCreate new project\n'));
    console.log('Available templates:');
    Object.entries(TEMPLATES).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(15)} - ${value.description}`);
    });
    console.log();
    return;
  }

  if (!name) {
    console.log(chalk.red('Please provide a project name'));
    return;
  }

  const spinner = ora(`Creating ${name}...`).start();

  try {
    const projectDir = path.join(process.cwd(), name);

    // Create directory
    await fs.mkdir(projectDir, { recursive: true });

    // Initialize git
    const git = simpleGit(projectDir);
    await git.init();

    // Create package.json
    const packageJson = {
      name,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'echo "Add dev script"',
        build: 'echo "Add build script"',
      },
    };

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create README
    await fs.writeFile(
      path.join(projectDir, 'README.md'),
      `# ${name}\n\nCreated with DevHub.\n`
    );

    // Initial commit
    await git.add('.');
    await git.commit('Initial commit');

    spinner.succeed(`Project ${name} created successfully`);
    console.log(chalk.dim(`\n  cd ${name}`));
    console.log(chalk.dim('  npm install'));
    console.log(chalk.dim('  npm run dev\n'));
  } catch (error) {
    spinner.fail('Failed to create project');
    console.log(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}