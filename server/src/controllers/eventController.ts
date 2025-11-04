import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { validationResult } from 'express-validator';

export const getAllEvents = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, eventType, userId } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate as string);
      }
    }

    if (eventType) {
      where.eventType = eventType as string;
    }

    if (userId) {
      where.attendees = {
        some: {
          userId: userId as string,
        },
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        creator: {
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
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attendees: {
          select: {
            id: true,
            status: true,
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
      },
      orderBy: { startTime: 'asc' },
    });

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
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
        attendees: {
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
        parentEvent: true,
        childEvents: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      location,
      isAllDay,
      projectId,
      clientId,
      recurrenceRule,
      notificationMinutesBefore,
      color,
      attendeeIds,
    } = req.body;
    const userId = req.user!.userId;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        eventType: eventType || 'OTHER',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        isAllDay: isAllDay || false,
        projectId,
        clientId,
        createdBy: userId,
        recurrenceRule,
        notificationMinutesBefore: notificationMinutesBefore || [],
        color,
        attendees: attendeeIds
          ? {
              create: attendeeIds.map((attendeeId: string) => ({
                userId: attendeeId,
                status: attendeeId === userId ? 'ACCEPTED' : 'PENDING',
              })),
            }
          : {
              create: [
                {
                  userId,
                  status: 'ACCEPTED',
                },
              ],
            },
      },
      include: {
        creator: {
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
        attendees: {
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
      },
    });

    // TODO: Schedule notifications based on notificationMinutesBefore

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      location,
      isAllDay,
      projectId,
      clientId,
      recurrenceRule,
      notificationMinutesBefore,
      color,
    } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        eventType,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        location,
        isAllDay,
        projectId,
        clientId,
        recurrenceRule,
        notificationMinutesBefore,
        color,
      },
      include: {
        creator: {
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
        attendees: {
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
      },
    });

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.event.delete({
      where: { id },
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addEventAttendee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, status } = req.body;

    const attendee = await prisma.eventAttendee.create({
      data: {
        eventId: id,
        userId,
        status: status || 'PENDING',
      },
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
    });

    res.status(201).json(attendee);
  } catch (error) {
    console.error('Add event attendee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeEventAttendee = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    await prisma.eventAttendee.delete({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });

    res.json({ message: 'Event attendee removed successfully' });
  } catch (error) {
    console.error('Remove event attendee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAttendeeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.userId;

    const attendee = await prisma.eventAttendee.update({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
      data: {
        status,
      },
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
    });

    res.json(attendee);
  } catch (error) {
    console.error('Update attendee status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
