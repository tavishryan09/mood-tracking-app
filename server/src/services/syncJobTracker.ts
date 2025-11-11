/**
 * Database-backed job tracker for Outlook sync operations
 * This tracks sync progress so the UI can poll for updates
 * Uses UserSetting table for persistence across serverless invocations
 */

import prisma from '../config/database';

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
  private readonly JOB_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new sync job
   */
  async createJob(userId: string): Promise<string> {
    const jobId = `sync-${userId}-${Date.now()}`;
    const job: SyncJob = {
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
    };

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: jobId
        }
      },
      create: {
        userId,
        key: jobId,
        value: job as any
      },
      update: {
        value: job as any
      }
    });

    return jobId;
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: Partial<SyncJob['progress']>): Promise<void> {
    try {
      const setting = await prisma.userSetting.findFirst({
        where: { key: jobId }
      });

      if (setting) {
        const job = setting.value as any as SyncJob;
        job.progress = { ...job.progress, ...progress };

        await prisma.userSetting.update({
          where: {
            userId_key: {
              userId: setting.userId,
              key: jobId
            }
          },
          data: { value: job as any }
        });
      }
    } catch (error) {
      console.error('[SyncJobTracker] Error updating progress:', error);
    }
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, finalProgress: SyncJob['progress']): Promise<void> {
    try {
      const setting = await prisma.userSetting.findFirst({
        where: { key: jobId }
      });

      if (setting) {
        const job = setting.value as any as SyncJob;
        job.status = 'completed';
        job.progress = finalProgress;
        job.completedAt = Date.now();

        await prisma.userSetting.update({
          where: {
            userId_key: {
              userId: setting.userId,
              key: jobId
            }
          },
          data: { value: job as any }
        });
      }
    } catch (error) {
      console.error('[SyncJobTracker] Error completing job:', error);
    }
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    try {
      const setting = await prisma.userSetting.findFirst({
        where: { key: jobId }
      });

      if (setting) {
        const job = setting.value as any as SyncJob;
        job.status = 'failed';
        job.progress.errors.push(error);
        job.completedAt = Date.now();

        await prisma.userSetting.update({
          where: {
            userId_key: {
              userId: setting.userId,
              key: jobId
            }
          },
          data: { value: job as any }
        });
      }
    } catch (error) {
      console.error('[SyncJobTracker] Error failing job:', error);
    }
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<SyncJob | undefined> {
    try {
      const setting = await prisma.userSetting.findFirst({
        where: { key: jobId }
      });

      if (!setting) return undefined;

      const job = setting.value as any as SyncJob;

      // Clean up old jobs
      if (job.completedAt && Date.now() - job.completedAt > this.JOB_EXPIRY_MS) {
        await prisma.userSetting.delete({
          where: {
            userId_key: {
              userId: setting.userId,
              key: jobId
            }
          }
        }).catch(() => {
          // Ignore errors if already deleted
        });
        return undefined;
      }

      return job;
    } catch (error) {
      console.error('[SyncJobTracker] Error getting job:', error);
      return undefined;
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const settings = await prisma.userSetting.findMany({
        where: {
          key: {
            startsWith: 'sync-'
          }
        }
      });

      for (const setting of settings) {
        const job = setting.value as any as SyncJob;
        if (job.completedAt && now - job.completedAt > this.JOB_EXPIRY_MS) {
          await prisma.userSetting.delete({
            where: {
              userId_key: {
                userId: setting.userId,
                key: setting.key
              }
            }
          }).catch(() => {
            // Ignore errors if already deleted
          });
        }
      }
    } catch (error) {
      console.error('[SyncJobTracker] Error cleaning up jobs:', error);
    }
  }
}

export const syncJobTracker = new SyncJobTracker();
