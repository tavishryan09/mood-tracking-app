import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAppSettings() {
  try {

    // Check for the three settings that are failing
    const keys = ['default_custom_theme', 'custom_color_palettes', 'element_color_mapping'];

    for (const key of keys) {

      const setting = await prisma.appSetting.findUnique({
        where: { key },
      });

      if (setting) {

      } else {

      }
    }

    // Also list all app settings

    const allSettings = await prisma.appSetting.findMany();

    allSettings.forEach(s => {

    });

  } catch (error) {
    console.error('Error checking app settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppSettings();
