import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'Назва обов\'язкова' }, { status: 400 });

  try {
    const supplier = await prisma.supplier.create({ data: { name: body.name, phone: body.phone } });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Такий постачальник вже існує' }, { status: 400 });
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
