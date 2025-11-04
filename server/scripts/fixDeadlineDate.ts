import prisma from '../src/config/database';

async function main() {
  // Find the P555 deadline
  const deadline = await prisma.deadlineTask.findFirst({
    where: {
      description: 'P555',
      deadlineType: 'DEADLINE',
    }
  });

  if (!deadline) {
    console.log('P555 deadline not found');
    return;
  }

  console.log('Current deadline date:', deadline.date);
  console.log('Current deadline date ISO:', deadline.date.toISOString());

  // Create correct date using UTC to avoid timezone issues
  const correctDate = new Date(Date.UTC(2025, 11, 12, 0, 0, 0, 0)); // Month is 0-indexed
  console.log('Correct date:', correctDate.toISOString());

  // Update the deadline
  const updated = await prisma.deadlineTask.update({
    where: { id: deadline.id },
    data: {
      date: correctDate,
    }
  });

  console.log('✅ Updated deadline date:', updated.date.toISOString());
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
