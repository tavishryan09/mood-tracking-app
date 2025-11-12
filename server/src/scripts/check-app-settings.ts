import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAppSettings() {
  try {
    console.log('Checking app settings...\n');

    // Check for the three settings that are failing
    const keys = ['default_custom_theme', 'custom_color_palettes', 'element_color_mapping'];

    for (const key of keys) {
      console.log(`\nChecking key: ${key}`);
      const setting = await prisma.appSetting.findUnique({
        where: { key },
      });

      if (setting) {
        console.log(`  ✓ Found: ${JSON.stringify(setting, null, 2)}`);
      } else {
        console.log(`  ✗ Not found`);
      }
    }

    // Also list all app settings
    console.log('\n\nAll app settings:');
    const allSettings = await prisma.appSetting.findMany();
    console.log(`Total count: ${allSettings.length}`);
    allSettings.forEach(s => {
      console.log(`  - ${s.key}: ${typeof s.value}`);
    });

  } catch (error) {
    console.error('Error checking app settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppSettings();
