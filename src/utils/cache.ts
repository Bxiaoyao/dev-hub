import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import type { Project } from '../types/index.js';

const DB_PATH = path.join(os.homedir(), '.devhub', 'cache', 'devhub.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      path TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_git INTEGER DEFAULT 0,
      branch TEXT,
      remote TEXT,
      status TEXT DEFAULT 'unknown',
      uncommitted_changes INTEGER DEFAULT 0,
      ahead INTEGER DEFAULT 0,
      behind INTEGER DEFAULT 0,
      last_modified INTEGER,
      package_manager TEXT,
      has_package_json INTEGER DEFAULT 0,
      cached_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS operation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT,
      action TEXT NOT NULL,
      success INTEGER DEFAULT 1,
      message TEXT,
      timestamp INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
    CREATE INDEX IF NOT EXISTS idx_projects_cached ON projects(cached_at);
  `);
}

export function cacheProjects(projects: Project[]): void {
  const db = getDb();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO projects (
      path, name, is_git, branch, remote, status, uncommitted_changes,
      ahead, behind, last_modified, package_manager, has_package_json, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: Project[]) => {
    for (const p of items) {
      stmt.run(
        p.path,
        p.name,
        p.isGit ? 1 : 0,
        p.branch || null,
        p.remote || null,
        p.status,
        p.uncommittedChanges || 0,
        p.ahead || 0,
        p.behind || 0,
        p.lastModified.getTime(),
        p.packageManager || null,
        p.hasPackageJson ? 1 : 0,
        now
      );
    }
  });

  insertMany(projects);
}

export function getCachedProjects(): Project[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM projects
    ORDER BY last_modified DESC
  `).all() as any[];

  return rows.map((row) => ({
    name: row.name,
    path: row.path,
    isGit: row.is_git === 1,
    branch: row.branch || undefined,
    remote: row.remote || undefined,
    status: row.status as 'clean' | 'dirty' | 'unknown',
    uncommittedChanges: row.uncommitted_changes,
    ahead: row.ahead,
    behind: row.behind,
    lastModified: new Date(row.last_modified),
    packageManager: row.package_manager as 'npm' | 'yarn' | 'pnpm' | 'bun' | undefined,
    hasPackageJson: row.has_package_json === 1,
  }));
}

export function getCacheAge(): number | null {
  const db = getDb();

  const row = db.prepare(`
    SELECT MAX(cached_at) as cached_at FROM projects
  `).get() as { cached_at: number | null };

  return row.cached_at;
}

export function isCacheValid(maxAgeMs: number = 5 * 60 * 1000): boolean {
  const cachedAt = getCacheAge();
  if (!cachedAt) return false;
  return Date.now() - cachedAt < maxAgeMs;
}

export function clearCache(): void {
  const db = getDb();
  db.exec('DELETE FROM projects');
}

export function recordOperation(
  projectPath: string,
  action: string,
  success: boolean,
  message?: string
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO operation_history (project_path, action, success, message, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectPath, action, success ? 1 : 0, message || null, Date.now());
}

export function getRecentOperations(limit: number = 50): {
  projectPath: string;
  action: string;
  success: boolean;
  message?: string;
  timestamp: Date;
}[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM operation_history
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row) => ({
    projectPath: row.project_path,
    action: row.action,
    success: row.success === 1,
    message: row.message || undefined,
    timestamp: new Date(row.timestamp),
  }));
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}