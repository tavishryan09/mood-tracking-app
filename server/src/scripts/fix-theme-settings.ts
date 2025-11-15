import prisma from '../config/database';

async function main() {
  try {

    const deleted = await prisma.appSetting.deleteMany({
      where: {
        OR: [
          { key: 'default_custom_theme' },
          { key: 'custom_color_palettes' }
        ]
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
