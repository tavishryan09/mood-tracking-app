import prisma from '../src/config/database';

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      client: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  console.log(`Found ${projects.length} projects:\n`);

  projects.forEach((project, i) => {
    console.log(`${i + 1}. ${project.projectNumber} - ${project.name}`);
    console.log(`   Client: ${project.client.name}`);
    console.log(`   Due Date: ${project.dueDate || 'Not set'}`);
    console.log(`   ID: ${project.id}`);
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
