import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';

export const getAllTravelEntries = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, userId, status } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.startDate.lte = new Date(endDate as string);
      }
    }

    if (userId) {
      where.userId = userId as string;
    }

    if (status) {
      where.status = status as string;
    }

    const travelEntries = await prisma.travelEntry.findMany({
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
          include: {
            client: true,
          },
        },
        client: true,
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(travelEntries);
  } catch (error) {
    console.error('Get travel entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTravelEntryById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const travelEntry = await prisma.travelEntry.findUnique({
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
        client: true,
      },
    });

    if (!travelEntry) {
      return res.status(404).json({ error: 'Travel entry not found' });
    }

    res.json(travelEntry);
  } catch (error) {
    console.error('Get travel entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTravelEntry = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      projectId,
      clientId,
      purpose,
      destination,
      startDate,
      endDate,
      transportationMode,
      accommodation,
      estimatedExpenses,
      actualExpenses,
      notes,
      status,
    } = req.body;
    const userId = req.user!.userId;

    const travelEntry = await prisma.travelEntry.create({
      data: {
        userId,
        projectId,
        clientId,
        purpose,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        transportationMode,
        accommodation,
        estimatedExpenses,
        actualExpenses,
        notes,
        status: status || 'PLANNED',
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
        client: true,
      },
    });

    res.status(201).json(travelEntry);
  } catch (error) {
    console.error('Create travel entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTravelEntry = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      projectId,
      clientId,
      purpose,
      destination,
      startDate,
      endDate,
      transportationMode,
      accommodation,
      estimatedExpenses,
      actualExpenses,
      notes,
      status,
    } = req.body;

    const travelEntry = await prisma.travelEntry.update({
      where: { id },
      data: {
        projectId,
        clientId,
        purpose,
        destination,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        transportationMode,
        accommodation,
        estimatedExpenses,
        actualExpenses,
        notes,
        status,
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
        client: true,
      },
    });

    res.json(travelEntry);
  } catch (error) {
    console.error('Update travel entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTravelEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.travelEntry.delete({
      where: { id },
    });

    res.json({ message: 'Travel entry deleted successfully' });
  } catch (error) {
    console.error('Delete travel entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
