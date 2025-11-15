import prisma from '../config/database';
import { avatarStorageService } from '../services/avatarStorageService';

async function migrateAvatars() {

  const users = await prisma.user.findMany({
    where: {
      avatarUrl: {
        not: null,
        startsWith: 'data:'  // Only base64 avatars
      }
    },
    select: { id: true, avatarUrl: true, firstName: true, lastName: true }
  });

  let migrated = 0;
  let failed = 0;

  for (const user of users) {
    try {
      if (!user.avatarUrl) continue;

      // Convert base64 to file
      const newAvatarUrl = await avatarStorageService.convertBase64ToFile(user.avatarUrl);

      // Update database
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: newAvatarUrl }
      });

      migrated++;

    } catch (error) {
      failed++;
      console.error(`[Migration] ❌ Failed to migrate ${user.firstName} ${user.lastName}:`, error);
    }
  }

  process.exit(0);
}

migrateAvatars().catch(error => {
  console.error('[Migration] Fatal error:', error);
  process.exit(1);
});
