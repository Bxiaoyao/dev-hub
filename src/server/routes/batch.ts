import { Router } from 'express';
import { initConfig } from '../../utils/config.js';
import { scanProjects } from '../../core/scanner.js';
import { installDependencies, upgradePackage } from '../../core/deps.js';
import { pull, fetchAll, commitChanges, push, createAndCheckoutBranch } from '../../core/git.js';
import { cleanMultiple } from '../../core/size.js';

export const batchRouter = Router();

interface BatchJob {
  id: string;
  action: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  completed: number;
  results: { project: string; status: string; message?: string }[];
  cancelled: boolean;
}

const jobs = new Map<string, BatchJob>();

// Start batch operation
batchRouter.post('/', async (req, res) => {
  try {
    const { action, projectIds, packageName, packageVersion, branchName, commitMessage } = req.body;

    const config = await initConfig();
    const projects = await scanProjects(config);

    const selectedProjects = projects.filter((p) =>
      projectIds.includes(p.name) || projectIds.includes(p.path)
    );

    const jobId = Date.now().toString();

    const job: BatchJob = {
      id: jobId,
      action,
      status: 'running',
      total: selectedProjects.length,
      completed: 0,
      results: [],
      cancelled: false,
    };

    jobs.set(jobId, job);

    // Return immediately, process in background
    res.json({ jobId, total: selectedProjects.length });

    // Process in background
    (async () => {
      for (const project of selectedProjects) {
        // Check if cancelled
        if (job.cancelled) {
          job.status = 'cancelled';
          return;
        }

        let result: { success: boolean; error?: string } = { success: false, error: 'Unknown error' };

        try {
          switch (action) {
            case 'install':
              if (project.packageManager) {
                result = await installDependencies(
                  project.path,
                  project.packageManager
                );
              } else {
                result = { success: false, error: 'No package manager' };
              }
              break;

            case 'upgrade':
              if (project.packageManager && packageName) {
                result = await upgradePackage(
                  project.path,
                  packageName,
                  packageVersion,
                  project.packageManager
                );
              } else {
                result = { success: false, error: 'No package manager or package name' };
              }
              break;

            case 'pull':
              if (project.isGit) {
                result = await pull(project.path);
              } else {
                result = { success: false, error: 'Not a git repository' };
              }
              break;

            case 'fetch':
              if (project.isGit) {
                result = await fetchAll(project.path);
              } else {
                result = { success: false, error: 'Not a git repository' };
              }
              break;

            case 'createBranch':
              if (project.isGit && branchName) {
                result = await createAndCheckoutBranch(project.path, branchName);
              } else {
                result = { success: false, error: 'Not a git repository or no branch name' };
              }
              break;

            case 'commit':
              if (project.isGit && commitMessage) {
                result = await commitChanges(project.path, commitMessage);
              } else {
                result = { success: false, error: 'Not a git repository or no commit message' };
              }
              break;

            case 'push':
              if (project.isGit) {
                result = await push(project.path);
              } else {
                result = { success: false, error: 'Not a git repository' };
              }
              break;

            case 'clean':
              const cleanResult = await cleanMultiple(project.path, [
                'node_modules',
                'dist',
                '.next',
                'build',
              ]);
              result.success = cleanResult.failed.length === 0;
              result.error = cleanResult.failed.length > 0
                ? `Failed: ${cleanResult.failed.join(', ')}`
                : undefined;
              break;
          }
        } catch (error) {
          result.error = (error as Error).message;
        }

        job.results.push({
          project: project.name,
          status: result.success ? 'success' : 'failed',
          message: result.error,
        });
        job.completed++;
      }

      job.status = job.cancelled ? 'cancelled' : 'completed';
    })();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get batch job status
batchRouter.get('/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});

// Cancel batch job
batchRouter.post('/:jobId/cancel', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status !== 'running') {
    res.status(400).json({ error: 'Job is not running' });
    return;
  }

  job.cancelled = true;
  job.status = 'cancelled';
  res.json({ success: true, message: 'Job cancelled' });
});