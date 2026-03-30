import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const status = searchParams.get('status');
  const imei = searchParams.get('imei');
  const q = searchParams.get('q');

  const where: any = {};
  if (locationId) where.locationId = parseInt(locationId);
  if (status) where.status = status;
  if (imei) where.imei = { contains: imei };
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    where.AND = terms.map(term => ({
      OR: [
        { imei: { contains: term } },
        { product: { name: { contains: term } } },
        { product: { brand: { contains: term } } },
        { product: { sku: { contains: term } } },
      ]
    }));
  }

  const items = await prisma.item.findMany({
    where,
    include: { product: true, location: true, supplier: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(items);
}


export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { productId, locationId, imeis, quantity, purchasePrice, supplierId } = body;

  if (!productId || !locationId) {
    return NextResponse.json({ error: 'Невірні дані' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
  if (!product) return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });

  const isAccessory = !product.requiresImei;

  if (isAccessory && (!quantity || quantity <= 0)) {
    return NextResponse.json({ error: 'Вкажіть кількість для товару без IMEI' }, { status: 400 });
  }
  if (!isAccessory && (!imeis || !Array.isArray(imeis) || imeis.length === 0)) {
    return NextResponse.json({ error: 'Вкажіть хоча б один IMEI' }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: { type: 'RECEIVE', targetLocationId: parseInt(locationId) },
  });

  const createdItems = [];

  if (isAccessory) {
    const item = await prisma.item.create({
      data: {
        productId: parseInt(productId),
        locationId: parseInt(locationId),
        supplierId: supplierId ? parseInt(supplierId) : null,
        purchasePrice: parseFloat(purchasePrice) || 0,
        status: 'IN_STOCK',
        quantity: parseInt(quantity),
        imei: null,
      },
    });
    await prisma.transactionItem.create({ data: { transactionId: transaction.id, itemId: item.id } });
    createdItems.push(item);
  } else {
    for (const imei of imeis) {
      const trimmedImei = imei.trim();
      if (!trimmedImei) continue;

      const existing = await prisma.item.findUnique({ where: { imei: trimmedImei } });
      if (existing) continue;

      const item = await prisma.item.create({
        data: {
          imei: trimmedImei,
          productId: parseInt(productId),
          locationId: parseInt(locationId),
          supplierId: supplierId ? parseInt(supplierId) : null,
          purchasePrice: parseFloat(purchasePrice) || 0,
          status: 'IN_STOCK',
          quantity: 1,
        },
      });

      await prisma.transactionItem.create({ data: { transactionId: transaction.id, itemId: item.id } });
      createdItems.push(item);
    }
  }

  return NextResponse.json({ created: isAccessory ? parseInt(quantity) : createdItems.length, transaction }, { status: 201 });
}
