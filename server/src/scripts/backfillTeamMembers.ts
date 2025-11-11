import prisma from '../config/database';

/**
 * This script backfills team members for existing planning tasks.
 * It finds all planning tasks that have a projectId and automatically adds
 * the assigned user as a team member if they aren't already.
 */

async function backfillTeamMembers() {
  console.log('[Backfill] Starting team member backfill...');

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

    console.log(`[Backfill] Found ${planningTasks.length} planning tasks with projects`);

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

    console.log(`[Backfill] Found ${userProjectPairs.size} unique user-project pairs to process`);

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
          console.log(`[Backfill] SKIP: ${pair.userName} already member of ${pair.projectName}`);
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
          console.log(`[Backfill] ADDED: ${pair.userName} to ${pair.projectName}`);
          addedCount++;
        }
      } catch (error) {
        console.error(`[Backfill] ERROR processing ${pair.userName} -> ${pair.projectName}:`, error);
      }
    }

    console.log('\n[Backfill] Summary:');
    console.log(`  - Total user-project pairs: ${userProjectPairs.size}`);
    console.log(`  - Added: ${addedCount}`);
    console.log(`  - Skipped (already members): ${skippedCount}`);
    console.log('\n[Backfill] Completed successfully!');

  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillTeamMembers();
