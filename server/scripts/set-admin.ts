import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdminRole() {
  try {
    const email = 'tavishryan@gmail.com';

    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    console.log('✅ User updated successfully:');
    console.log(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error('❌ User not found with email: tavishryan@gmail.com');
      console.log('Please ensure you have registered with this email first.');
    } else {
      console.error('❌ Error updating user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

setAdminRole();
