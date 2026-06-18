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
  lastModified: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  nodeVersion?: string;
  hasPackageJson: boolean;
  tags?: string[];
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
  tags?: {
    presets: string[];
  };
}