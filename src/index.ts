#!/usr/bin/env node
import { Command } from 'commander';
import { startServer } from './server/index.js';
import { listProjects } from './cli/list.js';
import { exportProjects } from './cli/export.js';
import { importProjects } from './cli/import.js';
import { initConfig } from './utils/config.js';

const program = new Command();

program
  .name('devhub')
  .description('一站式管理本地开发项目：项目浏览、分支管理、依赖管理、环境导出/导入')
  .version('0.1.0');

// 默认启动 Web UI
program
  .option('-p, --port <number>', '服务器端口', '3200')
  .option('--no-open', '不自动打开浏览器')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    await startServer({ port, open: options.open !== false });
  });

// 列出项目
program
  .command('list')
  .description('列出所有项目')
  .option('-j, --json', 'JSON 格式输出')
  .option('-f, --filter <pattern>', '过滤项目名')
  .action(async (options) => {
    await listProjects(options);
  });

// 导出项目配置
program
  .command('export')
  .description('导出项目配置到文件')
  .option('-o, --output <file>', '输出文件路径', 'devhub-projects.yaml')
  .option('--no-hooks', '不包含 hooks')
  .action(async (options) => {
    await exportProjects(options);
  });

// 导入项目
program
  .command('import')
  .description('从配置文件导入项目')
  .requiredOption('-f, --file <file>', '配置文件路径')
  .option('-d, --directory <dir>', '目标目录', process.cwd())
  .option('--parallel <n>', '并行数量', '3')
  .option('--skip-hooks', '跳过 hooks')
  .option('--dry-run', '预览模式')
  .action(async (options) => {
    await importProjects(options);
  });

// 项目信息
program
  .command('info <project>')
  .description('显示项目详情')
  .action(async (projectName) => {
    const { showProjectInfo } = await import('./cli/info.js');
    await showProjectInfo(projectName);
  });

// 打开编辑器
program
  .command('open [project]')
  .description('用编辑器打开项目')
  .option('-e, --editor <editor>', '指定编辑器')
  .action(async (projectName, options) => {
    const { openProject } = await import('./cli/open.js');
    await openProject(projectName, options.editor);
  });

// Git 命令
program
  .command('git <project>')
  .argument('[action]', 'pull | fetch | status | log')
  .description('Git 操作')
  .action(async (projectName, action) => {
    const { gitAction } = await import('./cli/git.js');
    await gitAction(projectName, action);
  });

// 依赖命令
program
  .command('deps <project>')
  .argument('[action]', 'install | update | audit')
  .description('依赖管理')
  .action(async (projectName, action) => {
    const { depsAction } = await import('./cli/deps.js');
    await depsAction(projectName, action);
  });

// 批量操作
program
  .command('batch <action>')
  .description('批量操作所有项目')
  .option('-p, --parallel', '并行执行')
  .action(async (action, options) => {
    const { batchAction } = await import('./cli/batch.js');
    await batchAction(action, options);
  });

// 创建项目
program
  .command('create')
  .description('从模板创建新项目')
  .argument('[template]', '模板名称')
  .argument('[name]', '项目名称')
  .action(async (template, name) => {
    const { createProject } = await import('./cli/create.js');
    await createProject(template, name);
  });

// 健康检查
program
  .command('check')
  .description('项目健康检查')
  .option('--fix', '自动修复问题')
  .action(async (options) => {
    const { healthCheck } = await import('./cli/health.js');
    await healthCheck(options.fix);
  });

// 快照
program
  .command('snapshot <subcommand>')
  .description('环境快照 (save/restore/list/delete)')
  .option('-n, --name <name>', '快照名称')
  .action(async (subcommand, options) => {
    const { snapshotAction } = await import('./cli/snapshot.js');
    await snapshotAction(subcommand, options);
  });

program.parse();