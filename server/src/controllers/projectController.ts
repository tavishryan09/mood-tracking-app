import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';

export const getAllProjects = async (req: AuthRequest, res: Response) => {
  try {
    // Optimized: Use aggregation instead of loading all timeEntries and planningTasks
    // This prevents N+1 queries and reduces data transfer
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
          select: {
            userId: true,
            customHourlyRate: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                defaultHourlyRate: true,
                // Don't include avatarUrl here - it's base64 and huge
              },
            },
          },
        },
        // Include planning tasks for project hours calculations
        planningTasks: {
          select: {
            span: true,
            date: true,
            userId: true,
          },
        },
        // Only get counts for other records
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
        _count: {
          select: {
            events: true,
            planningTasks: true,
          },
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
      projectValue,
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
        projectValue,
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

      // Create deadline task for planning view
      // Parse the date and create a UTC midnight date to avoid timezone issues
      const dueDateParsed = new Date(dueDate);
      const dueDateNormalized = new Date(Date.UTC(
        dueDateParsed.getFullYear(),
        dueDateParsed.getMonth(),
        dueDateParsed.getDate(),
        0, 0, 0, 0
      ));

      // Find available slot on the due date
      const existingTasksOnDate = await prisma.deadlineTask.findMany({
        where: {
          date: dueDateNormalized,
        },
      });

      const usedSlots = new Set(existingTasksOnDate.map(t => t.slotIndex));
      let availableSlot = 0;
      if (usedSlots.has(0)) {
        availableSlot = 1;
        if (!usedSlots.has(1)) {
          // Slot 1 is available
          await prisma.deadlineTask.create({
            data: {
              date: dueDateNormalized,
              slotIndex: availableSlot,
              clientId,
              description: name,
              deadlineType: 'DEADLINE',
              projectId: project.id,
              isAutoGenerated: true,
              createdBy: userId,
            },
          });
        } else {
          // Both slots taken - log warning but continue

        }
      } else {
        // Slot 0 is available
        await prisma.deadlineTask.create({
          data: {
            date: dueDateNormalized,
            slotIndex: availableSlot,
            clientId,
            description: name,
            deadlineType: 'DEADLINE',
            projectId: project.id,
            isAutoGenerated: true,
            createdBy: userId,
          },
        });
      }
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
      projectValue,
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
        projectValue,
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

      // Handle deadline task when dueDate changes
      // Find existing auto-generated deadline task for this project
      const existingDeadlineTask = await prisma.deadlineTask.findFirst({
        where: {
          projectId: id,
          isAutoGenerated: true,
        },
      });

      // If dueDate was removed, delete the deadline task
      if (existingDueDate && !newDueDate && existingDeadlineTask) {
        await prisma.deadlineTask.delete({
          where: { id: existingDeadlineTask.id },
        });
      }
      // If dueDate was added or changed, update or create deadline task
      else if (newDueDate && existingDueDate !== newDueDate) {
        // Normalize the due date to start of day (midnight UTC) to avoid timezone issues
        const dueDateParsed = new Date(dueDate);
        const dueDateNormalized = new Date(Date.UTC(
          dueDateParsed.getFullYear(),
          dueDateParsed.getMonth(),
          dueDateParsed.getDate(),
          0, 0, 0, 0
        ));

        if (existingDeadlineTask) {
          // Check if the date changed - if so, we need to find a new slot
          const existingDateNormalized = new Date(existingDeadlineTask.date);
          existingDateNormalized.setHours(0, 0, 0, 0);

          if (existingDateNormalized.getTime() !== dueDateNormalized.getTime()) {
            // Date changed - need to find available slot on new date
            const existingTaskOnNewDate = await prisma.deadlineTask.findMany({
              where: {
                date: dueDateNormalized,
              },
            });

            // Find available slot (0 or 1)
            const usedSlots = new Set(existingTaskOnNewDate.map(t => t.slotIndex));
            let availableSlot = 0;
            if (usedSlots.has(0)) {
              availableSlot = 1;
              if (usedSlots.has(1)) {
                // Both slots taken - delete the old task and skip creating new one
                await prisma.deadlineTask.delete({
                  where: { id: existingDeadlineTask.id },
                });

                return res.json(project);
              }
            }

            // Update with new date and slot
            await prisma.deadlineTask.update({
              where: { id: existingDeadlineTask.id },
              data: {
                date: dueDateNormalized,
                slotIndex: availableSlot,
                clientId,
                description: name,
              },
            });
          } else {
            // Same date - just update description and client
            await prisma.deadlineTask.update({
              where: { id: existingDeadlineTask.id },
              data: {
                clientId,
                description: name,
              },
            });
          }
        } else {
          // Create new deadline task - find available slot
          const existingTasksOnDate = await prisma.deadlineTask.findMany({
            where: {
              date: dueDateNormalized,
            },
          });

          const usedSlots = new Set(existingTasksOnDate.map(t => t.slotIndex));
          let availableSlot = 0;
          if (usedSlots.has(0)) {
            availableSlot = 1;
            if (usedSlots.has(1)) {
              // Both slots taken - skip creating deadline task

              return res.json(project);
            }
          }

          await prisma.deadlineTask.create({
            data: {
              date: dueDateNormalized,
              slotIndex: availableSlot,
              clientId,
              description: name,
              deadlineType: 'DEADLINE',
              projectId: id,
              isAutoGenerated: true,
              createdBy: userId,
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

    // Actually delete the project (cascade will handle related records)
    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: 'Project deleted successfully' });
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

export const updateProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const { role, customHourlyRate } = req.body;

    const member = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId: id,
          userId: memberId,
        },
      },
      data: {
        role,
        customHourlyRate,
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

    res.json(member);
  } catch (error) {
    console.error('Update project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;

    // First try to find the member to get the userId
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Project member not found' });
    }

    // Delete using the compound key
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId: member.userId,
        },
      },
    });

    res.json({ message: 'Project member removed successfully' });
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
