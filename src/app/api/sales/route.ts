import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { cart, clientId } = body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return NextResponse.json({ error: 'Кошик порожній' }, { status: 400 });
  }


  const firstItemDb = await prisma.item.findUnique({
    where: { id: parseInt(cart[0].itemId) },
  });

  const sourceLocationId = session.role === 'CASHIER' ? session.locationId : firstItemDb?.locationId;

  const transaction = await prisma.transaction.create({
    data: {
      type: 'SALE',
      sourceLocationId,
      clientId: clientId ? parseInt(clientId) : null,
      userId: session.id,
    },
  });

  for (const c of cart) {
    const item = await prisma.item.findUnique({
      where: { id: parseInt(c.itemId) },
      include: { product: true },
    });

    if (!item || item.status !== 'IN_STOCK' || item.quantity < c.quantity) {
      continue;
    }

    if (item.quantity > c.quantity) {
      await prisma.item.update({
        where: { id: item.id },
        data: { quantity: item.quantity - c.quantity },
      });
    } else {
      await prisma.item.update({
        where: { id: item.id },
        data: { quantity: 0, status: 'SOLD', locationId: null },
      });
    }

    await prisma.transactionItem.create({
      data: {
        transactionId: transaction.id,
        itemId: item.id,
        quantity: c.quantity,
        price: parseFloat(c.salePrice) || item.product.price
      },
    });
  }

  return NextResponse.json({ ok: true, transactionId: transaction.id });
}


export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const locationId = searchParams.get('locationId');

  const whereClause: any = { type: { in: ['SALE', 'RETURN'] } };

  if (date) {
    const fromDate = new Date(date);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(date);
    toDate.setHours(23, 59, 59, 999);
    whereClause.createdAt = { gte: fromDate, lte: toDate };
  }


  if (session.role === 'CASHIER') {
    whereClause.sourceLocationId = session.locationId;
  } else if (locationId) {
    whereClause.sourceLocationId = parseInt(locationId);
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      items: {
        include: {
          item: {
            include: { product: true },
          },
        },
      },
      sourceLocation: true,
      client: true,
      user: { select: { username: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    transactions,
    isAdmin: session.role === 'ADMIN',
  });
}
