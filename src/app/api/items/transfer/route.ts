import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { itemIds, fromLocationId, toLocationId } = body;

  if (!itemIds || !fromLocationId || !toLocationId) {
    return NextResponse.json({ error: 'Невірні дані' }, { status: 400 });
  }


  const transaction = await prisma.transaction.create({
    data: {
      type: 'TRANSFER',
      sourceLocationId: parseInt(fromLocationId),
      targetLocationId: parseInt(toLocationId),
    },
  });


  for (const itemId of itemIds) {
    await prisma.item.update({
      where: { id: parseInt(itemId) },
      data: { locationId: parseInt(toLocationId) },
    });

    await prisma.transactionItem.create({
      data: { transactionId: transaction.id, itemId: parseInt(itemId) },
    });
  }

  return NextResponse.json({ ok: true, transferred: itemIds.length });
}
