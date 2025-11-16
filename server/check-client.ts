import prisma from './src/config/database';

async function checkClient() {
  try {
    const client = await prisma.client.findUnique({
      where: { id: 'c7df1ca1-1e4c-46d7-a38e-1e5900108ca6' },
      include: {
        contacts: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        projects: {
          include: {
            _count: {
              select: {
                timeEntries: true,
              },
            },
          },
        },
      }
    });
    console.log('Client found:', JSON.stringify(client, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClient();
