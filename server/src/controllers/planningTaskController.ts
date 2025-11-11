import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';
import { outlookCalendarService } from '../services/outlookCalendarService';

export const getAllPlanningTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const where: any = {};

    if (userId) {
      where.userId = userId as string;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const planningTasks = await prisma.planningTask.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { blockIndex: 'asc' }],
    });

    res.json(planningTasks);
  } catch (error) {
    console.error('Get planning tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlanningTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const planningTask = await prisma.planningTask.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
    });

    if (!planningTask) {
      return res.status(404).json({ error: 'Planning task not found' });
    }

    res.json(planningTask);
  } catch (error) {
    console.error('Get planning task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPlanningTask = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, projectId, date, blockIndex, task, span } = req.body;

    // Check if a planning task already exists for this user, date, and block
    const existing = await prisma.planningTask.findUnique({
      where: {
        userId_date_blockIndex: {
          userId,
          date: new Date(date),
          blockIndex,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: 'A planning task already exists for this time block'
      });
    }

    const planningTask = await prisma.planningTask.create({
      data: {
        userId,
        projectId,
        date: new Date(date),
        blockIndex,
        task: task || null,
        span: span || 1,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
    });

    // If this task is associated with a project, automatically add the user as a team member
    if (projectId) {
      try {
        // Check if user is already a member
        const existingMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId,
            },
          },
        });

        // If not already a member, add them
        if (!existingMember) {
          await prisma.projectMember.create({
            data: {
              projectId,
              userId,
              assignedBy: userId, // Self-assigned for auto-add
            },
          });
          console.log(`[PlanningTask] Automatically added user ${userId} to project ${projectId}`);
        }
      } catch (error) {
        // Log but don't fail the planning task creation if team member addition fails
        console.error('[PlanningTask] Failed to auto-add team member:', error);
      }
    }

    // Sync to the assigned user's Outlook calendar (non-blocking)
    outlookCalendarService.syncPlanningTask(planningTask.id, userId).catch((error) => {
      console.error('[Outlook] Failed to sync planning task:', error);
    });

    res.status(201).json(planningTask);
  } catch (error) {
    console.error('Create planning task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePlanningTask = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { projectId, task, span, blockIndex, completed, userId, date } = req.body;

    // Get the existing task first to track userId and projectId changes
    const existingTask = await prisma.planningTask.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Planning task not found' });
    }

    const oldUserId = existingTask.userId;
    const oldProjectId = existingTask.projectId;

    // If blockIndex is being changed, we need to delete and recreate due to unique constraint
    if (blockIndex !== undefined) {
      // Check if blockIndex is actually changing
      if (existingTask.blockIndex !== blockIndex) {
        // Delete the old task and create a new one with the new blockIndex
        await prisma.planningTask.delete({
          where: { id },
        });

        const planningTask = await prisma.planningTask.create({
          data: {
            userId: userId || existingTask.userId,
            projectId: projectId || existingTask.projectId,
            date: date ? new Date(date) : existingTask.date,
            blockIndex,
            task: task !== undefined ? task : existingTask.task,
            span: span !== undefined ? span : existingTask.span,
            completed: completed !== undefined ? completed : existingTask.completed,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
              },
            },
          },
        });

        // Auto-add team member if project changed or user changed
        const newUserId = userId || existingTask.userId;
        const newProjectId = projectId || existingTask.projectId;

        if (newProjectId) {
          try {
            const existingMember = await prisma.projectMember.findUnique({
              where: {
                projectId_userId: {
                  projectId: newProjectId,
                  userId: newUserId,
                },
              },
            });

            if (!existingMember) {
              await prisma.projectMember.create({
                data: {
                  projectId: newProjectId,
                  userId: newUserId,
                  assignedBy: newUserId, // Self-assigned for auto-add
                },
              });
              console.log(`[PlanningTask] Auto-added user ${newUserId} to project ${newProjectId}`);
            }
          } catch (error) {
            console.error('[PlanningTask] Failed to auto-add team member:', error);
          }
        }

        // If userId changed, delete from old user's calendar and sync to new user's calendar
        if (userId && userId !== oldUserId) {
          console.log(`[Outlook] Planning task moved from user ${oldUserId} to ${userId}`);

          // Delete from old user's calendar (non-blocking)
          outlookCalendarService.deletePlanningTask(id, oldUserId).catch((error) => {
            console.error('[Outlook] Failed to delete planning task from old user:', error);
          });

          // Sync to new user's calendar (non-blocking)
          outlookCalendarService.syncPlanningTask(planningTask.id, planningTask.userId).catch((error) => {
            console.error('[Outlook] Failed to sync planning task to new user:', error);
          });
        } else {
          // Same user, just sync
          outlookCalendarService.syncPlanningTask(planningTask.id, planningTask.userId).catch((error) => {
            console.error('[Outlook] Failed to sync planning task:', error);
          });
        }

        return res.json(planningTask);
      }
    }

    // Normal update (no blockIndex change)
    const updateData: any = {};

    // Only update projectId if provided
    if (projectId !== undefined) {
      updateData.projectId = projectId;
    }

    // Only update task if provided
    if (task !== undefined) {
      updateData.task = task || null;
    }

    // Only update span if provided
    if (span !== undefined) {
      updateData.span = span;
    }

    // Only update completed if provided
    if (completed !== undefined) {
      updateData.completed = completed;
    }

    // Only update userId if provided
    if (userId !== undefined) {
      updateData.userId = userId;
    }

    // Only update date if provided
    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    const planningTask = await prisma.planningTask.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
    });

    // Auto-add team member if project changed or user changed
    const finalProjectId = planningTask.projectId;
    const finalUserId = planningTask.userId;

    if (finalProjectId) {
      try {
        const existingMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: finalProjectId,
              userId: finalUserId,
            },
          },
        });

        if (!existingMember) {
          await prisma.projectMember.create({
            data: {
              projectId: finalProjectId,
              userId: finalUserId,
              assignedBy: finalUserId, // Self-assigned for auto-add
            },
          });
          console.log(`[PlanningTask] Auto-added user ${finalUserId} to project ${finalProjectId}`);
        }
      } catch (error) {
        console.error('[PlanningTask] Failed to auto-add team member:', error);
      }
    }

    // If userId changed, delete from old user's calendar and sync to new user's calendar
    if (userId && userId !== oldUserId) {
      console.log(`[Outlook] Planning task moved from user ${oldUserId} to ${userId}`);

      // Delete from old user's calendar (non-blocking)
      outlookCalendarService.deletePlanningTask(id, oldUserId).catch((error) => {
        console.error('[Outlook] Failed to delete planning task from old user:', error);
      });

      // Sync to new user's calendar (non-blocking)
      outlookCalendarService.syncPlanningTask(planningTask.id, planningTask.userId).catch((error) => {
        console.error('[Outlook] Failed to sync planning task to new user:', error);
      });
    } else {
      // Same user, just sync
      outlookCalendarService.syncPlanningTask(planningTask.id, planningTask.userId).catch((error) => {
        console.error('[Outlook] Failed to sync planning task:', error);
      });
    }

    res.json(planningTask);
  } catch (error) {
    console.error('Update planning task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePlanningTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get task before deleting (to get userId and outlookEventId for Outlook sync)
    const task = await prisma.planningTask.findUnique({
      where: { id },
      select: { userId: true, outlookEventId: true }
    });

    // Delete from the assigned user's Outlook calendar BEFORE deleting from database
    if (task?.userId && task?.outlookEventId) {
      outlookCalendarService.deletePlanningTaskByEventId(task.outlookEventId, task.userId).catch((error) => {
        console.error('[Outlook] Failed to delete planning task:', error);
      });
    }

    await prisma.planningTask.delete({
      where: { id },
    });

    res.json({ message: 'Planning task deleted successfully' });
  } catch (error) {
    console.error('Delete planning task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
