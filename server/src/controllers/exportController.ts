// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import * as XLSX from 'xlsx';

export const exportTimeReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, projectId, userId, groupBy } = req.query;

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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          include: {
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    // Prepare data for Excel
    const excelData = timeEntries.map((entry) => ({
      Date: entry.startTime.toLocaleDateString(),
      'Start Time': entry.startTime.toLocaleTimeString(),
      'End Time': entry.endTime?.toLocaleTimeString() || 'Running',
      'Duration (minutes)': entry.durationMinutes || 0,
      'Duration (hours)': entry.durationMinutes ? (entry.durationMinutes / 60).toFixed(2) : 0,
      User: `${entry.user.firstName} ${entry.user.lastName}`,
      Project: entry.project.name,
      Client: entry.project.client.name,
      Description: entry.description || '',
      Billable: entry.isBillable ? 'Yes' : 'No',
    }));

    // Calculate totals
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(2);

    // Add totals row
    excelData.push({
      Date: '',
      'Start Time': '',
      'End Time': '',
      'Duration (minutes)': totalMinutes,
      'Duration (hours)': totalHours,
      User: 'TOTAL',
      Project: '',
      Client: '',
      Description: '',
      Billable: '',
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Report');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=time-report-${Date.now()}.xlsx`);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Export time report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportProjectSummary = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: {
          select: {
            name: true,
          },
        },
        timeEntries: true,
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    const excelData = projects.map((project) => {
      const totalMinutes = project.timeEntries.reduce(
        (sum, entry) => sum + (entry.durationMinutes || 0),
        0
      );
      const totalHours = (totalMinutes / 60).toFixed(2);
      const billableMinutes = project.timeEntries
        .filter((entry) => entry.isBillable)
        .reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
      const billableHours = (billableMinutes / 60).toFixed(2);

      return {
        Project: project.name,
        Client: project.client.name,
        Status: project.status,
        'Start Date': project.startDate?.toLocaleDateString() || 'N/A',
        'End Date': project.endDate?.toLocaleDateString() || 'N/A',
        'Budget Hours': project.budgetHours?.toString() || 'N/A',
        'Total Hours': totalHours,
        'Billable Hours': billableHours,
        'Budget Amount': project.budgetAmount?.toString() || 'N/A',
        'Team Members': project._count.members,
        Events: project._count.events,
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Summary');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=project-summary-${Date.now()}.xlsx`);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Export project summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportTravelReport = async (req: AuthRequest, res: Response) => {
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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const excelData = travelEntries.map((entry) => ({
      User: `${entry.user.firstName} ${entry.user.lastName}`,
      Purpose: entry.purpose,
      Destination: entry.destination,
      'Start Date': entry.startDate.toLocaleDateString(),
      'End Date': entry.endDate.toLocaleDateString(),
      'Transportation Mode': entry.transportationMode || 'N/A',
      Accommodation: entry.accommodation || 'N/A',
      Project: entry.project?.name || 'N/A',
      Client: entry.client?.name || 'N/A',
      'Estimated Expenses': entry.estimatedExpenses?.toString() || '0',
      'Actual Expenses': entry.actualExpenses?.toString() || '0',
      Status: entry.status,
      Notes: entry.notes || '',
    }));

    // Calculate totals
    const totalEstimated = travelEntries.reduce(
      (sum, entry) => sum + (parseFloat(entry.estimatedExpenses?.toString() || '0')),
      0
    );
    const totalActual = travelEntries.reduce(
      (sum, entry) => sum + (parseFloat(entry.actualExpenses?.toString() || '0')),
      0
    );

    excelData.push({
      User: 'TOTAL',
      Purpose: '',
      Destination: '',
      'Start Date': '',
      'End Date': '',
      'Transportation Mode': '',
      Accommodation: '',
      Project: '',
      Client: '',
      'Estimated Expenses': totalEstimated.toFixed(2),
      'Actual Expenses': totalActual.toFixed(2),
      Status: '',
      Notes: '',
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Travel Report');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=travel-report-${Date.now()}.xlsx`);

    res.send(excelBuffer);
  } catch (error) {
    console.error('Export travel report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
