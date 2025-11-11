/**
 * In-memory job tracker for Outlook sync operations
 * This tracks sync progress so the UI can poll for updates
 */

interface SyncJob {
  userId: string;
  status: 'in_progress' | 'completed' | 'failed';
  progress: {
    totalTasks: number;
    syncedPlanningTasks: number;
    syncedDeadlineTasks: number;
    deletedEvents: number;
    errors: string[];
  };
  startedAt: number;
  completedAt?: number;
}

class SyncJobTracker {
  private jobs: Map<string, SyncJob> = new Map();
  private readonly JOB_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new sync job
   */
  createJob(userId: string): string {
    const jobId = `${userId}-${Date.now()}`;
    this.jobs.set(jobId, {
      userId,
      status: 'in_progress',
      progress: {
        totalTasks: 0,
        syncedPlanningTasks: 0,
        syncedDeadlineTasks: 0,
        deletedEvents: 0,
        errors: []
      },
      startedAt: Date.now()
    });
    return jobId;
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: Partial<SyncJob['progress']>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = { ...job.progress, ...progress };
    }
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string, finalProgress: SyncJob['progress']): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = finalProgress;
      job.completedAt = Date.now();
    }
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.progress.errors.push(error);
      job.completedAt = Date.now();
    }
  }

  /**
   * Get job status
   */
  getJob(jobId: string): SyncJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    // Clean up old jobs
    if (job.completedAt && Date.now() - job.completedAt > this.JOB_EXPIRY_MS) {
      this.jobs.delete(jobId);
      return undefined;
    }

    return job;
  }

  /**
   * Clean up old jobs periodically
   */
  cleanup(): void {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && now - job.completedAt > this.JOB_EXPIRY_MS) {
        this.jobs.delete(jobId);
      }
    }
  }
}

export const syncJobTracker = new SyncJobTracker();

// Cleanup old jobs every minute
setInterval(() => {
  syncJobTracker.cleanup();
}, 60 * 1000);
