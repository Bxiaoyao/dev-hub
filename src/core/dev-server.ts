import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { execa } from 'execa';
import { getConfigDir } from '../utils/config.js';
import { normalizeProjectPath } from '../utils/project-path.js';
import type { DevServerStatus } from '../types/index.js';

interface DevServerRegistryEntry {
  pid: number;
  script: string;
  startedAt: string;
  port?: number;
}

type DevServerRegistry = Record<string, DevServerRegistryEntry>;

const REGISTRY_FILE = () => path.join(getConfigDir(), 'dev-servers.json');
const LOG_DIR = () => path.join(getConfigDir(), 'logs');

const DEV_SERVER_PATTERNS = [
  /\bvite\b/i,
  /\bnext dev\b/i,
  /\bwebpack-dev-server\b/i,
  /\breact-scripts start\b/i,
  /\bnuxt dev\b/i,
  /\bastro dev\b/i,
  /\bremix dev\b/i,
  /\bparcel\b/i,
  /\bng serve\b/i,
  /\bnpm run dev\b/i,
  /\bpnpm (run )?dev\b/i,
  /\byarn dev\b/i,
  /\bbun run dev\b/i,
  /\bnode\b.*\bdev\b/i,
];

const EMPTY_STATUS: DevServerStatus = {
  running: false,
  ports: [],
  pids: [],
  managedByDevHub: false,
};

function buildStatus(
  partial: Partial<DevServerStatus> & Pick<DevServerStatus, 'running'>
): DevServerStatus {
  const ports = [...new Set(partial.ports ?? [])].sort((a, b) => a - b);
  const pids = [...new Set(partial.pids ?? [])].sort((a, b) => a - b);
  const url = partial.url ?? (ports[0] ? `http://localhost:${ports[0]}` : undefined);
  return {
    running: partial.running,
    ports,
    pids,
    url,
    script: partial.script,
    managedByDevHub: partial.managedByDevHub ?? false,
    startedAt: partial.startedAt,
  };
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function looksLikeDevServer(command: string): boolean {
  return DEV_SERVER_PATTERNS.some((pattern) => pattern.test(command));
}

async function readRegistry(): Promise<DevServerRegistry> {
  try {
    const content = await fs.readFile(REGISTRY_FILE(), 'utf-8');
    const parsed = JSON.parse(content) as DevServerRegistry;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeRegistry(registry: DevServerRegistry): Promise<void> {
  await fs.mkdir(getConfigDir(), { recursive: true });
  await fs.writeFile(REGISTRY_FILE(), JSON.stringify(registry, null, 2), 'utf-8');
}

async function getRegistryEntry(projectPath: string): Promise<DevServerRegistryEntry | null> {
  const key = normalizeProjectPath(projectPath);
  const registry = await readRegistry();
  return registry[key] ?? null;
}

async function setRegistryEntry(
  projectPath: string,
  entry: DevServerRegistryEntry | null
): Promise<void> {
  const key = normalizeProjectPath(projectPath);
  const registry = await readRegistry();
  if (entry) {
    registry[key] = entry;
  } else {
    delete registry[key];
  }
  await writeRegistry(registry);
}

async function getProcessCommand(pid: number): Promise<string> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execa(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
        ],
        { reject: false }
      );
      return stdout.trim();
    } catch {
      return '';
    }
  }

  try {
    const { stdout } = await execa('ps', ['-p', String(pid), '-o', 'command='], {
      reject: false,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

async function getDescendantPids(rootPid: number): Promise<number[]> {
  const pids = [rootPid];
  if (process.platform === 'win32') {
    return pids;
  }

  try {
    const { stdout } = await execa('pgrep', ['-P', String(rootPid)], { reject: false });
    for (const line of stdout.split('\n').filter(Boolean)) {
      const child = parseInt(line, 10);
      if (!Number.isNaN(child)) {
        pids.push(...(await getDescendantPids(child)));
      }
    }
  } catch {
    // pgrep unavailable
  }

  return [...new Set(pids)];
}

async function getListeningPorts(pid: number): Promise<number[]> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execa(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Get-NetTCPConnection -State Listen -OwningProcess ${pid} | Select-Object -ExpandProperty LocalPort`,
        ],
        { reject: false }
      );
      return stdout
        .split('\n')
        .map((line) => parseInt(line.trim(), 10))
        .filter((port) => !Number.isNaN(port) && port > 0);
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execa(
      'lsof',
      ['-Pan', '-p', String(pid), '-iTCP', '-sTCP:LISTEN'],
      { reject: false }
    );
    const ports: number[] = [];
    for (const line of stdout.split('\n')) {
      const match = line.match(/:(\d+)\s*\(LISTEN\)/);
      if (match) {
        ports.push(parseInt(match[1], 10));
      }
    }
    return ports;
  } catch {
    return [];
  }
}

async function findPidsByProjectPath(projectPath: string): Promise<number[]> {
  const resolved = path.resolve(projectPath);

  if (process.platform === 'win32') {
    return [];
  }

  try {
    const { stdout } = await execa(
      'lsof',
      ['-a', '-d', 'cwd', '-Fn', '+D', resolved],
      { reject: false }
    );
    const pids = new Set<number>();
    for (const line of stdout.split('\n')) {
      if (line.startsWith('p')) {
        const pid = parseInt(line.slice(1), 10);
        if (!Number.isNaN(pid)) {
          pids.add(pid);
        }
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

async function collectPortsForPids(pids: number[]): Promise<number[]> {
  const ports: number[] = [];
  for (const pid of pids) {
    ports.push(...(await getListeningPorts(pid)));
  }
  return [...new Set(ports)].sort((a, b) => a - b);
}

async function detectDevServerPids(projectPath: string): Promise<number[]> {
  const candidates = await findPidsByProjectPath(projectPath);
  const devPids: number[] = [];

  for (const pid of candidates) {
    const tree = await getDescendantPids(pid);
    const ports = await collectPortsForPids(tree);
    const command = await getProcessCommand(pid);

    if (ports.length > 0 || looksLikeDevServer(command)) {
      devPids.push(...tree);
    }
  }

  return [...new Set(devPids)].sort((a, b) => a - b);
}

export async function detectDevScript(projectPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};

    if (scripts.dev) return 'dev';

    for (const name of ['dev:web', 'start:dev', 'serve', 'develop']) {
      if (scripts[name]) return name;
    }

    return null;
  } catch {
    return null;
  }
}

export async function getDevServerStatus(projectPath: string): Promise<DevServerStatus> {
  const registryEntry = await getRegistryEntry(projectPath);
  let managedByDevHub = false;
  let script = registryEntry?.script;
  let startedAt = registryEntry?.startedAt;
  const pids = new Set<number>();

  if (registryEntry && isProcessAlive(registryEntry.pid)) {
    managedByDevHub = true;
    const tree = await getDescendantPids(registryEntry.pid);
    tree.forEach((pid) => pids.add(pid));
  } else if (registryEntry) {
    await setRegistryEntry(projectPath, null);
  }

  const detected = await detectDevServerPids(projectPath);
  detected.forEach((pid) => pids.add(pid));

  if (pids.size === 0) {
    return EMPTY_STATUS;
  }

  const alivePids = [...pids].filter((pid) => isProcessAlive(pid));
  if (alivePids.length === 0) {
    if (registryEntry) {
      await setRegistryEntry(projectPath, null);
    }
    return EMPTY_STATUS;
  }

  const ports = await collectPortsForPids(alivePids);

  return buildStatus({
    running: true,
    ports,
    pids: alivePids,
    script,
    managedByDevHub,
    startedAt,
  });
}

export async function getBatchDevServerStatus(
  projectPaths: string[]
): Promise<Record<string, DevServerStatus>> {
  const unique = [...new Set(projectPaths.filter(Boolean))];
  const result: Record<string, DevServerStatus> = {};

  await Promise.all(
    unique.map(async (projectPath) => {
      result[projectPath] = await getDevServerStatus(projectPath);
    })
  );

  return result;
}

function getPackageManagerCommand(
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
): { command: string; args: string[] } {
  switch (packageManager) {
    case 'pnpm':
      return { command: 'pnpm', args: ['run'] };
    case 'yarn':
      return { command: 'yarn', args: [] };
    case 'bun':
      return { command: 'bun', args: ['run'] };
    default:
      return { command: 'npm', args: ['run'] };
  }
}

function buildStartArgs(
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun',
  script: string,
  port?: number
): { command: string; args: string[] } {
  const pm = getPackageManagerCommand(packageManager);
  const args = [...pm.args, script];

  if (port) {
    if (packageManager === 'yarn') {
      args.push('--port', String(port));
    } else {
      args.push('--', '--port', String(port));
    }
  }

  return { command: pm.command, args };
}

async function waitForDevServerReady(
  projectPath: string,
  rootPid: number,
  timeoutMs = 30000
): Promise<DevServerStatus> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (!isProcessAlive(rootPid)) {
      throw new Error('开发服务器启动失败，进程已退出');
    }

    const status = await getDevServerStatus(projectPath);
    if (status.running && status.ports.length > 0) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const status = await getDevServerStatus(projectPath);
  if (status.running) {
    return status;
  }

  throw new Error('开发服务器启动超时，未检测到监听端口');
}

export async function startDevServer(
  projectPath: string,
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun',
  options?: { script?: string; port?: number }
): Promise<DevServerStatus> {
  const current = await getDevServerStatus(projectPath);
  if (current.running) {
    return current;
  }

  const script = options?.script ?? (await detectDevScript(projectPath));
  if (!script) {
    throw new Error('未找到 dev 脚本，请在 package.json 中配置 scripts.dev');
  }

  const { command, args } = buildStartArgs(packageManager, script, options?.port);

  await fs.mkdir(LOG_DIR(), { recursive: true });
  const logName = `${path.basename(projectPath)}-${Date.now()}.log`.replace(/[^\w.-]+/g, '_');
  const logPath = path.join(LOG_DIR(), logName);
  const logFd = fsSync.openSync(logPath, 'a');

  const env = { ...process.env };
  if (options?.port) {
    env.PORT = String(options.port);
  }

  const child = spawn(command, args, {
    cwd: projectPath,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env,
  });

  fsSync.closeSync(logFd);
  child.unref();

  if (!child.pid) {
    throw new Error('无法启动开发服务器进程');
  }

  const startedAt = new Date().toISOString();
  await setRegistryEntry(projectPath, {
    pid: child.pid,
    script,
    startedAt,
    port: options?.port,
  });

  try {
    const status = await waitForDevServerReady(projectPath, child.pid);
    return buildStatus({
      ...status,
      script,
      managedByDevHub: true,
      startedAt,
    });
  } catch (error) {
    await stopDevServer(projectPath);
    throw error;
  }
}

async function killPidTree(pid: number): Promise<void> {
  if (!isProcessAlive(pid)) return;

  if (process.platform === 'win32') {
    try {
      await execa('taskkill', ['/PID', String(pid), '/T', '/F'], { reject: false });
    } catch {
      // ignore
    }
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // ignore
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 800));

  if (isProcessAlive(pid)) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // ignore
      }
    }
  }
}

export async function stopDevServer(
  projectPath: string
): Promise<{ success: boolean; error?: string }> {
  const status = await getDevServerStatus(projectPath);
  if (!status.running) {
    await setRegistryEntry(projectPath, null);
    return { success: true };
  }

  const registryEntry = await getRegistryEntry(projectPath);
  const rootsToKill = new Set<number>();

  if (registryEntry && isProcessAlive(registryEntry.pid)) {
    rootsToKill.add(registryEntry.pid);
  }

  for (const pid of status.pids) {
    if (isProcessAlive(pid)) {
      rootsToKill.add(pid);
    }
  }

  if (rootsToKill.size === 0) {
    await setRegistryEntry(projectPath, null);
    return { success: true };
  }

  try {
    for (const pid of rootsToKill) {
      await killPidTree(pid);
    }

    await setRegistryEntry(projectPath, null);

    const remaining = await getDevServerStatus(projectPath);
    if (remaining.running) {
      return { success: false, error: '部分进程未能停止，请手动检查终端' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '停止开发服务器失败',
    };
  }
}
