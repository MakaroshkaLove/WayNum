import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const locations = await prisma.location.findMany({ orderBy: { type: 'asc' } });
  return NextResponse.json(locations);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, type } = body;

  if (!name) return NextResponse.json({ error: 'Назва обов\'язкова' }, { status: 400 });

  const location = await prisma.location.create({
    data: { name, type: type || 'STORE' },
  });

  return NextResponse.json(location, { status: 201 });
}
