/**
 * Script to reset planning grid border colors for all users
 * This removes any custom color mappings for border colors so users get the new default light borders
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetBorderColors() {
  try {
    console.log('Starting border color reset...');

    // Get all user settings that might contain custom color themes
    const userSettings = await prisma.userSetting.findMany({
      where: {
        OR: [
          { key: 'activeCustomTheme' },
          { key: 'customColorThemes' },
        ],
      },
    });

    console.log(`Found ${userSettings.length} user settings to check`);

    let updatedCount = 0;

    for (const setting of userSettings) {
      let needsUpdate = false;
      let updatedValue = setting.value;

      if (setting.key === 'activeCustomTheme' && typeof setting.value === 'object' && setting.value !== null) {
        const theme = setting.value as any;

        // Check if elementMapping has planning grid border colors
        if (theme.elementMapping?.planningGrid) {
          const planningGrid = theme.elementMapping.planningGrid;

          // Remove the old border color mappings so defaults are used
          if (planningGrid.cellBorderColor || planningGrid.headerBorderColor || planningGrid.teamMemberBorderColor) {
            delete planningGrid.cellBorderColor;
            delete planningGrid.headerBorderColor;
            delete planningGrid.teamMemberBorderColor;
            needsUpdate = true;
            console.log(`Removing border color mappings for user setting ${setting.id}`);
          }
        }

        if (needsUpdate) {
          updatedValue = theme;
        }
      }

      if (needsUpdate) {
        await prisma.userSetting.update({
          where: { id: setting.id },
          data: { value: updatedValue },
        });
        updatedCount++;
      }
    }

    console.log(`✅ Reset complete! Updated ${updatedCount} user settings`);
    console.log('Users will now see the new default light border colors');
  } catch (error) {
    console.error('❌ Error resetting border colors:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetBorderColors()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
