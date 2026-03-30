import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');

  const products = await prisma.product.findMany({
    include: {
      category: true,
      items: {
        where: {
          status: 'IN_STOCK',
          ...(locationId ? { locationId: parseInt(locationId) } : {})
        },
        select: { quantity: true }
      }
    },
    orderBy: { id: 'desc' }
  });

  const mapped = products.map((p: any) => {
    const stockCount = p.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
    const { items, ...rest } = p;
    return { ...rest, stockCount };
  });

  const filtered = locationId
    ? mapped.filter(p => p.stockCount > 0)
    : mapped;

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { name, brand, sku, price, categoryId, requiresImei } = body;

  if (!name) {
    return NextResponse.json({ error: 'Назва обов\'язкова' }, { status: 400 });
  }

  const p = await prisma.product.create({
    data: {
      name,
      brand,
      sku: sku || String(Math.floor(10000000 + Math.random() * 90000000)),
      price: parseFloat(price) || 0,
      categoryId: categoryId ? parseInt(categoryId) : null,
      requiresImei: requiresImei !== undefined ? requiresImei : true,
    },
    include: { category: true }
  });

  return NextResponse.json(p, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { id, name, brand, sku, price, categoryId, requiresImei } = body;

  if (!id || !name) return NextResponse.json({ error: 'Некоректні дані' }, { status: 400 });

  try {
    const updated = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        brand,
        sku,
        price: parseFloat(price) || 0,
        categoryId: categoryId ? parseInt(categoryId) : null,
        requiresImei,
      },
      include: { category: true }
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: 'Помилка оновлення' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID обов\'язковий' }, { status: 400 });

  try {

    const items = await prisma.item.findMany({ where: { productId: parseInt(id) }, select: { id: true } });
    const itemIds = items.map(i => i.id);

    if (itemIds.length > 0) {

      await prisma.transactionItem.deleteMany({
        where: { itemId: { in: itemIds } }
      });


      await prisma.item.deleteMany({
        where: { productId: parseInt(id) }
      });
    }


    await prisma.product.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Не вдалося видалити товар. Можливо є інші зв\'язки.' }, { status: 400 });
  }
}
