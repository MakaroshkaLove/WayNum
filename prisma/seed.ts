import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Початок базової ініціалізації чистої системи...');


  const warehouse = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Головний склад', type: 'WAREHOUSE' },
  });
  console.log('  ✔ Головний склад створено/перевірено');


  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPasswordRaw = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPasswordRaw, 10);

  console.log(`  Спроба ініціалізації адміна: логін [${adminUsername}]`);


  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {

      role: 'ADMIN'
    },
    create: {
      username: adminUsername,
      password: hashedPassword,
      role: 'ADMIN',
      locationId: warehouse.id,
      permissions: JSON.stringify([]),
    },
  });

  console.log(`  ✔ Акаунт Адміністратора успішно перевірено та збережено.`);
  console.log('✅ Ініціалізація (Seeding) успішно завершена! Ви готові до релізу.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
