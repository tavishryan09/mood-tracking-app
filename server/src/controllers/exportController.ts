// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import ExcelJS from 'exceljs';

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape values that contain commas, quotes, or newlines
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export const exportProjectSummary = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    // Use aggregation to calculate time entry totals efficiently
    const projectTimeStats = await Promise.all(
      projects.map(async (project) => {
        const totalStats = await prisma.timeEntry.aggregate({
          where: { projectId: project.id },
          _sum: { durationMinutes: true },
        });

        const billableStats = await prisma.timeEntry.aggregate({
          where: { projectId: project.id, isBillable: true },
          _sum: { durationMinutes: true },
        });

        return {
          projectId: project.id,
          totalMinutes: totalStats._sum.durationMinutes || 0,
          billableMinutes: billableStats._sum.durationMinutes || 0,
        };
      })
    );

    const csvData = projects.map((project) => {
      const stats = projectTimeStats.find(s => s.projectId === project.id);
      const totalHours = ((stats?.totalMinutes || 0) / 60).toFixed(2);
      const billableHours = ((stats?.billableMinutes || 0) / 60).toFixed(2);

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

    // Generate CSV
    const csv = convertToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-summary-${Date.now()}.csv`);

    res.send(csv);
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

    const csvData = travelEntries.map((entry) => ({
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

    csvData.push({
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

    // Generate CSV
    const csv = convertToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=travel-report-${Date.now()}.csv`);

    res.send(csv);
  } catch (error) {
    console.error('Export travel report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportPlannerSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { quarter } = req.params; // e.g., "2024-Q1"

    // Parse quarter string
    const [year, quarterStr] = quarter.split('-');
    const quarterNum = parseInt(quarterStr.replace('Q', ''));

    // Calculate start and end dates for the quarter
    const quarterStartMonth = (quarterNum - 1) * 3;
    const startDate = new Date(parseInt(year), quarterStartMonth, 1);
    const endDate = new Date(parseInt(year), quarterStartMonth + 3, 0, 23, 59, 59);

    // Fetch planning tasks for the quarter
    const planningTasks = await prisma.planningTask.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            name: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { user: { firstName: 'asc' } },
      ],
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Planning ${quarter}`);

    // Set column widths
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'User', key: 'user', width: 20 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Description', key: 'description', width: 40 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add data rows
    planningTasks.forEach((task) => {
      worksheet.addRow({
        date: task.date.toLocaleDateString(),
        user: `${task.user.firstName} ${task.user.lastName}`,
        client: task.project?.client?.name || 'N/A',
        project: task.project?.name || 'N/A',
        hours: task.hours || 0,
        description: task.description || '',
      });
    });

    // Add summary row
    const totalHours = planningTasks.reduce((sum, task) => sum + (task.hours || 0), 0);
    const summaryRow = worksheet.addRow({
      date: '',
      user: '',
      client: '',
      project: 'TOTAL',
      hours: totalHours,
      description: '',
    });
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' },
    };

    // Set borders for all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=planner-summary-${quarter}-${Date.now()}.xlsx`
    );

    res.send(buffer);
  } catch (error) {
    console.error('Export planner summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
