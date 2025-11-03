import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: 'asher@example.com',
      firstName: 'Asher',
      lastName: 'Harder',
      role: 'USER' as const,
    },
    {
      email: 'ava@example.com',
      firstName: 'Ava',
      lastName: 'Bender',
      role: 'USER' as const,
    },
    {
      email: 'kai@example.com',
      firstName: 'Kai',
      lastName: 'Mosvold',
      role: 'USER' as const,
    },
    {
      email: 'nick@example.com',
      firstName: 'Nick',
      lastName: 'Diaz',
      role: 'USER' as const,
    },
  ];

  // Default password for all users
  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`User ${userData.email} already exists, skipping...`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        isActive: true,
      },
    });

    console.log(`Created user: ${user.firstName} ${user.lastName} (${user.email})`);
  }

  console.log('\n✅ User seeding completed!');
  console.log('Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
