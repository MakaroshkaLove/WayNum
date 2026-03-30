import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, locationId: true, permissions: true, location: { select: { name: true } } },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { username, password, role, locationId, permissions } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Логін та пароль обов\'язкові' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: 'Такий логін вже існує' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      role: role || 'CASHIER',
      locationId: locationId ? parseInt(locationId) : null,
      permissions: permissions ? JSON.stringify(permissions) : '[]',
    },
  });

  return NextResponse.json({ id: user.id, username: user.username, role: user.role }, { status: 201 });
}
