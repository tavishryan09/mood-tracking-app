import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const email = 'tavishryan@gmail.com';
    const newPassword = 'Password123';

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    console.log(`✅ Password updated successfully for ${user.email}`);
    console.log(`   Email: ${email}`);
    console.log(`   New Password: ${newPassword}`);
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
