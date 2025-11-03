import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';

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
    const { projectId, task, span, blockIndex } = req.body;

    // If blockIndex is being changed, we need to delete and recreate due to unique constraint
    if (blockIndex !== undefined) {
      // Get the existing task
      const existingTask = await prisma.planningTask.findUnique({
        where: { id },
      });

      if (!existingTask) {
        return res.status(404).json({ error: 'Planning task not found' });
      }

      // Check if blockIndex is actually changing
      if (existingTask.blockIndex !== blockIndex) {
        // Delete the old task and create a new one with the new blockIndex
        await prisma.planningTask.delete({
          where: { id },
        });

        const planningTask = await prisma.planningTask.create({
          data: {
            userId: existingTask.userId,
            projectId: projectId || existingTask.projectId,
            date: existingTask.date,
            blockIndex,
            task: task !== undefined ? task : existingTask.task,
            span: span !== undefined ? span : existingTask.span,
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

        return res.json(planningTask);
      }
    }

    // Normal update (no blockIndex change)
    const updateData: any = {
      projectId,
      task: task || null,
    };

    // Only update span if provided
    if (span !== undefined) {
      updateData.span = span;
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

    res.json(planningTask);
  } catch (error) {
    console.error('Update planning task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePlanningTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.planningTask.delete({
      where: { id },
    });

    res.json({ message: 'Planning task deleted successfully' });
  } catch (error) {
    console.error('Delete planning task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
