import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Тільки адміністратор може скасовувати продажі' }, { status: 403 });
  }

  const body = await request.json();
  const { transactionId } = body;

  if (!transactionId) {
    return NextResponse.json({ error: 'Не вказано ID транзакції' }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(transactionId) },
    include: { items: true },
  });

  if (!transaction || transaction.type !== 'SALE') {
    return NextResponse.json({ error: 'Продаж не знайдено' }, { status: 404 });
  }


  for (const tItem of transaction.items) {
    const item = await prisma.item.findUnique({ where: { id: tItem.itemId } });
    if (!item) continue;

    if (item.imei) {

      await prisma.item.update({
        where: { id: item.id },
        data: { quantity: 1, status: 'IN_STOCK', locationId: transaction.sourceLocationId },
      });
    } else {

      await prisma.item.update({
        where: { id: item.id },
        data: {
          quantity: item.quantity + tItem.quantity,
          status: 'IN_STOCK',
          locationId: transaction.sourceLocationId
        },
      });
    }
  }


  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { type: 'RETURN' },
  });

  return NextResponse.json({ ok: true });
}
