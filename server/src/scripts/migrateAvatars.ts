import prisma from '../config/database';
import { avatarStorageService } from '../services/avatarStorageService';

async function migrateAvatars() {
  console.log('[Migration] Starting avatar migration from base64 to files...');

  const users = await prisma.user.findMany({
    where: {
      avatarUrl: {
        not: null,
        startsWith: 'data:'  // Only base64 avatars
      }
    },
    select: { id: true, avatarUrl: true, firstName: true, lastName: true }
  });

  console.log(`[Migration] Found ${users.length} users with base64 avatars`);

  let migrated = 0;
  let failed = 0;

  for (const user of users) {
    try {
      if (!user.avatarUrl) continue;

      console.log(`[Migration] Migrating avatar for ${user.firstName} ${user.lastName}...`);

      // Convert base64 to file
      const newAvatarUrl = await avatarStorageService.convertBase64ToFile(user.avatarUrl);

      // Update database
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: newAvatarUrl }
      });

      migrated++;
      console.log(`[Migration] ✅ Migrated ${user.firstName} ${user.lastName}`);
    } catch (error) {
      failed++;
      console.error(`[Migration] ❌ Failed to migrate ${user.firstName} ${user.lastName}:`, error);
    }
  }

  console.log(`[Migration] Complete! Migrated: ${migrated}, Failed: ${failed}`);
  process.exit(0);
}

migrateAvatars().catch(error => {
  console.error('[Migration] Fatal error:', error);
  process.exit(1);
});
