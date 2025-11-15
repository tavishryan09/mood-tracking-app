import prisma from '../config/database';

/**
 * This script backfills team members for existing planning tasks.
 * It finds all planning tasks that have a projectId and automatically adds
 * the assigned user as a team member if they aren't already.
 */

async function backfillTeamMembers() {

  try {
    // Get all planning tasks that have a project
    const planningTasks = await prisma.planningTask.findMany({
      where: {
        projectId: { not: null }
      },
      select: {
        id: true,
        userId: true,
        projectId: true,
        project: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Group by project and user to avoid duplicates
    const userProjectPairs = new Map<string, { userId: string, projectId: string, projectName: string, userName: string }>();

    for (const task of planningTasks) {
      const key = `${task.userId}-${task.projectId}`;
      if (!userProjectPairs.has(key)) {
        userProjectPairs.set(key, {
          userId: task.userId,
          projectId: task.projectId!,
          projectName: task.project?.name || 'Unknown',
          userName: `${task.user?.firstName} ${task.user?.lastName}`.trim() || task.user?.email || 'Unknown'
        });
      }
    }

    let addedCount = 0;
    let skippedCount = 0;

    // Process each unique user-project pair
    for (const [key, pair] of userProjectPairs.entries()) {
      try {
        // Check if user is already a team member
        const existingMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: pair.projectId,
              userId: pair.userId
            }
          }
        });

        if (existingMember) {

          skippedCount++;
        } else {
          // Add user as team member
          await prisma.projectMember.create({
            data: {
              projectId: pair.projectId,
              userId: pair.userId,
              assignedBy: pair.userId // Self-assigned during backfill
            }
          });

          addedCount++;
        }
      } catch (error) {
        console.error(`[Backfill] ERROR processing ${pair.userName} -> ${pair.projectName}:`, error);
      }
    }

  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillTeamMembers();
