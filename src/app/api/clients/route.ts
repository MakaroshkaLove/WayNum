import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  
  const clients = await prisma.client.findMany({
    where: q ? {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } }
      ]
    } : undefined,
    orderBy: { name: 'asc' },
    take: 50
  });
  
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Ім\'я обов\'язкове' }, { status: 400 });

  try {
    const client = await prisma.client.create({
      data: {
        name: body.name,
        phone: body.phone || null
      }
    });
    return NextResponse.json(client, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Клієнт з таким телефоном вже існує' }, { status: 400 });
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, name, phone } = body;

  try {
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { name, phone: phone || null }
    });
    return NextResponse.json(client);
  } catch (e) {
    return NextResponse.json({ error: 'Помилка оновлення' }, { status: 400 });
  }
}
