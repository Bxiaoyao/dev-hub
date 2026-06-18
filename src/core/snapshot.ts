import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { execa } from 'execa';
import type { Project } from '../types/index.js';

const SNAPSHOTS_DIR = path.join(os.homedir(), '.devhub', 'snapshots');

export interface Snapshot {
  name: string;
  created: string;
  projects: {
    name: string;
    path: string;
    git?: string;
    branch?: string;
    packageManager?: string;
  }[];
  globalPackages?: {
    npm?: string[];
    pnpm?: string[];
    yarn?: string[];
  };
  nodeVersion?: string;
  editorConfig?: {
    default: string;
    fallback: string[];
  };
}

export async function saveSnapshot(
  name: string,
  projects: Project[]
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });

    const snapshot: Snapshot = {
      name,
      created: new Date().toISOString(),
      projects: projects.map((p) => ({
        name: p.name,
        path: p.path,
        git: p.remote,
        branch: p.branch,
        packageManager: p.packageManager,
      })),
    };

    // Get global packages
    try {
      const npmResult = await execa('npm', ['list', '-g', '--depth=0', '--json']);
      const npmData = JSON.parse(npmResult.stdout);
      snapshot.globalPackages = {
        npm: Object.keys(npmData.dependencies || {}).filter(
          (k) => !['npm'].includes(k)
        ),
      };
    } catch {
      // npm not available or no global packages
    }

    // Get Node version
    try {
      const nodeResult = await execa('node', ['--version']);
      snapshot.nodeVersion = nodeResult.stdout;
    } catch {
      // Node not available
    }

    const snapshotPath = path.join(SNAPSHOTS_DIR, `${name}.yaml`);
    const content = YAML.stringify(snapshot);
    await fs.writeFile(snapshotPath, content, 'utf-8');

    return { success: true, path: snapshotPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function loadSnapshot(
  name: string
): Promise<{ success: boolean; snapshot?: Snapshot; error?: string }> {
  try {
    const snapshotPath = path.join(SNAPSHOTS_DIR, `${name}.yaml`);
    const content = await fs.readFile(snapshotPath, 'utf-8');
    const snapshot = YAML.parse(content) as Snapshot;
    return { success: true, snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function listSnapshots(): Promise<
  { name: string; created: string; projectCount: number }[]
> {
  try {
    const files = await fs.readdir(SNAPSHOTS_DIR);
    const snapshots: { name: string; created: string; projectCount: number }[] = [];

    for (const file of files) {
      if (file.endsWith('.yaml')) {
        try {
          const content = await fs.readFile(path.join(SNAPSHOTS_DIR, file), 'utf-8');
          const snapshot = YAML.parse(content) as Snapshot;
          snapshots.push({
            name: snapshot.name,
            created: snapshot.created,
            projectCount: snapshot.projects.length,
          });
        } catch {
          // Invalid snapshot file
        }
      }
    }

    return snapshots.sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  } catch {
    return [];
  }
}

export async function deleteSnapshot(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const snapshotPath = path.join(SNAPSHOTS_DIR, `${name}.yaml`);
    await fs.unlink(snapshotPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
