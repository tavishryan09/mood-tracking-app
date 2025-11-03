import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';

export const getAllProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        timeEntries: {
          select: {
            durationMinutes: true,
          },
        },
        planningTasks: {
          select: {
            span: true,
          },
        },
        _count: {
          select: {
            timeEntries: true,
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      projectNumber,
      name,
      description,
      clientId,
      status,
      startDate,
      endDate,
      dueDate,
      budgetHours,
      budgetAmount,
      useStandardRate,
      standardHourlyRate,
      color,
      memberIds,
    } = req.body;
    const userId = req.user!.userId;

    const project = await prisma.project.create({
      data: {
        projectNumber,
        name,
        description,
        clientId,
        status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        budgetHours,
        budgetAmount,
        useStandardRate: useStandardRate !== undefined ? useStandardRate : true,
        standardHourlyRate,
        color,
        createdBy: userId,
        members: memberIds
          ? {
              create: memberIds.map((memberId: string) => ({
                userId: memberId,
                assignedBy: userId,
              })),
            }
          : undefined,
      },
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create deadline event if dueDate is provided
    if (dueDate) {
      await prisma.event.create({
        data: {
          title: `${name} - Due Date`,
          description: `Project ${name} is due`,
          eventType: 'DEADLINE',
          startTime: new Date(dueDate),
          endTime: new Date(dueDate),
          isAllDay: true,
          projectId: project.id,
          clientId,
          createdBy: userId,
          color: color || '#FF3B30',
        },
      });
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      projectNumber,
      name,
      description,
      clientId,
      status,
      startDate,
      endDate,
      dueDate,
      budgetHours,
      budgetAmount,
      useStandardRate,
      standardHourlyRate,
      color,
    } = req.body;
    const userId = req.user!.userId;

    // Get the existing project to check if dueDate changed
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    const project = await prisma.project.update({
      where: { id },
      data: {
        projectNumber: projectNumber !== undefined ? projectNumber : undefined,
        name,
        description,
        clientId,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        budgetHours,
        budgetAmount,
        useStandardRate: useStandardRate !== undefined ? useStandardRate : undefined,
        standardHourlyRate,
        color,
      },
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Handle deadline event when dueDate changes
    if (existingProject) {
      const existingDueDate = existingProject.dueDate?.getTime();
      const newDueDate = dueDate ? new Date(dueDate).getTime() : null;

      // Find existing deadline event for this project
      const existingDeadlineEvent = await prisma.event.findFirst({
        where: {
          projectId: id,
          eventType: 'DEADLINE',
          title: {
            contains: existingProject.name,
          },
        },
      });

      // If dueDate was removed, delete the deadline event
      if (existingDueDate && !newDueDate && existingDeadlineEvent) {
        await prisma.event.delete({
          where: { id: existingDeadlineEvent.id },
        });
      }
      // If dueDate was added or changed, update or create deadline event
      else if (newDueDate && existingDueDate !== newDueDate) {
        if (existingDeadlineEvent) {
          // Update existing event
          await prisma.event.update({
            where: { id: existingDeadlineEvent.id },
            data: {
              title: `${name} - Due Date`,
              description: `Project ${name} is due`,
              startTime: new Date(dueDate),
              endTime: new Date(dueDate),
              color: color || existingDeadlineEvent.color,
            },
          });
        } else {
          // Create new event
          await prisma.event.create({
            data: {
              title: `${name} - Due Date`,
              description: `Project ${name} is due`,
              eventType: 'DEADLINE',
              startTime: new Date(dueDate),
              endTime: new Date(dueDate),
              isAllDay: true,
              projectId: id,
              clientId,
              createdBy: userId,
              color: color || '#FF3B30',
            },
          });
        }
      }
    }

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    res.json({ message: 'Project archived successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role, customHourlyRate } = req.body;
    const assignedBy = req.user!.userId;

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId,
        role,
        customHourlyRate,
        assignedBy,
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
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId: memberId,
        },
      },
    });

    res.json({ message: 'Project member removed successfully' });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
