import prisma from '../config/database';

async function main() {
  try {
    console.log('Deleting corrupted theme settings from production database...');
    const deleted = await prisma.appSetting.deleteMany({
      where: {
        OR: [
          { key: 'default_custom_theme' },
          { key: 'custom_color_palettes' }
        ]
      }
    });
    console.log(`Successfully deleted ${deleted.count} corrupted settings`);
    console.log('\nNow you can set your theme as default again in the app.');
    console.log('The new deployment code will save it correctly.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
