export interface Project {
  name: string;
  path: string;
  isGit: boolean;
  branch?: string;
  remote?: string;
  status: 'clean' | 'dirty' | 'unknown';
  uncommittedChanges?: number;
  ahead?: number;
  behind?: number;
  lastModified: Date;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  nodeVersion?: string;
  hasPackageJson: boolean;
}

export interface ProjectDetail extends Project {
  branches: BranchInfo[];
  dependencies?: DependencyInfo;
  size?: SizeInfo;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  ahead?: number;
  behind?: number;
  lastCommit?: string;
  lastCommitDate?: Date;
}

export interface DependencyInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  outdated?: OutdatedPackage[];
}

export interface OutdatedPackage {
  name: string;
  current: string;
  latest: string;
  type: 'dependencies' | 'devDependencies';
}

export interface SizeInfo {
  total: number;
  breakdown: {
    name: string;
    size: number;
    cleanable: boolean;
  }[];
}

export interface Config {
  workspace: {
    roots: string[];
    maxDepth: number;
    ignore: string[];
  };
  editor: {
    default: string;
    fallback: string[];
  };
  terminal: {
    default: string;
    custom: string | null;
  };
  hooks: {
    afterClone: string[];
    afterBranchSwitch: string[];
  };
  display: {
    dateFormat: 'relative' | 'absolute';
    showSize: boolean;
    theme: 'auto' | 'dark' | 'light';
  };
  export: {
    defaultFormat: 'yaml' | 'json';
    includeHooks: boolean;
  };
  git?: {
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      useSSH?: boolean;
    };
    rememberCredentials?: boolean;
  };
}

export interface ExportedProject {
  name: string;
  git?: string;
  branch?: string;
  packageManager?: string;
  nodeVersion?: string;
  hooks?: {
    afterClone?: string[];
    afterBranchSwitch?: string[];
  };
}

export interface ExportData {
  version: number;
  generated: string;
  projects: ExportedProject[];
}

export type FilterType = 'all' | 'git' | 'recent';
export type SortType = 'recent' | 'name' | 'branch';