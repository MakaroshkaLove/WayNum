const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Починаємо очищення бази даних від тестових товарів та транзакцій...');
  
  try {
    await prisma.transactionItem.deleteMany();
    console.log('- Чек-Товари видалені');
    
    await prisma.transaction.deleteMany();
    console.log('- Історія Продажів/Повернень/Надходжень видалена');
    
    await prisma.item.deleteMany();
    console.log('- Фізичні залишки (IMEI) видалені');
    
    await prisma.product.deleteMany();
    console.log('- Товарна база (моделі) видалена');
    
    await prisma.category.deleteMany();
    console.log('- Категорії видалені');
    
    await prisma.supplier.deleteMany();
    console.log('- Постачальники видалені');
    
    console.log('✅ Очищення завершено. (Ваш акаунт, інші співробітники та "Точки" були залишені для зручності)');
  } catch (error) {
    console.error('Помилка:', error);
  }
}

main().finally(() => prisma.$disconnect());
