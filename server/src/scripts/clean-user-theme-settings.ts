import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanUserThemeSettings(userId: number) {
  try {
    console.log(`Cleaning theme settings for user ${userId}...`);

    // Delete the active_custom_theme setting
    const deleted = await prisma.userSetting.deleteMany({
      where: {
        userId: userId,
        key: 'active_custom_theme',
      },
    });

    console.log(`Deleted ${deleted.count} active_custom_theme settings`);

    console.log('Done!');
  } catch (error) {
    console.error('Error cleaning theme settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get user ID from command line argument
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!userId) {
  console.error('Usage: npx ts-node src/scripts/clean-user-theme-settings.ts <userId>');
  process.exit(1);
}

cleanUserThemeSettings(userId);
