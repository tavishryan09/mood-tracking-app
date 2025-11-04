import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';

export const getAllTimeEntries = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, projectId, userId } = req.query;

    const where: any = {};

    if (startDate) {
      where.startTime = { ...where.startTime, gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.startTime = { ...where.startTime, lte: new Date(endDate as string) };
    }

    if (projectId) {
      where.projectId = projectId as string;
    }

    if (userId) {
      where.userId = userId as string;
    }

    const timeEntries = await prisma.timeEntry.findMany({
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
            color: true,
            status: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json(timeEntries);
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTimeEntryById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const timeEntry = await prisma.timeEntry.findUnique({
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
          include: {
            client: true,
          },
        },
      },
    });

    if (!timeEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    res.json(timeEntry);
  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTimeEntry = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, description, startTime, endTime, isBillable, isManualEntry } = req.body;
    const userId = req.user!.userId;

    let durationMinutes = null;
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId,
        projectId,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        durationMinutes,
        isBillable: isBillable !== undefined ? isBillable : true,
        isManualEntry: isManualEntry || false,
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
          include: {
            client: true,
          },
        },
      },
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTimeEntry = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { projectId, description, startTime, endTime, isBillable } = req.body;

    let durationMinutes = null;
    if (endTime && startTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        projectId,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : null,
        durationMinutes,
        isBillable,
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
          include: {
            client: true,
          },
        },
      },
    });

    res.json(timeEntry);
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const stopTimer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Find the running timer
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        userId,
        endTime: null,
      },
    });

    if (!timeEntry) {
      return res.status(404).json({ error: 'Running timer not found' });
    }

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60)
    );

    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        endTime,
        durationMinutes,
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
          include: {
            client: true,
          },
        },
      },
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error('Stop timer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRunningTimer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const runningTimer = await prisma.timeEntry.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json(runningTimer);
  } catch (error) {
    console.error('Get running timer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTimeEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.timeEntry.delete({
      where: { id },
    });

    res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
